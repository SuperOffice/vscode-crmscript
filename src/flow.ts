/*
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 *
 * MODIFIED BY: Tony Yates:
 *  - supports client_secret
 *  - supports callback handler (without expressjs)
 *  - validates id_token.
 */

import { AuthorizationRequest } from '@openid/appauth/built/authorization_request';
import {
  AuthorizationNotifier,
  AuthorizationRequestHandler,
  AuthorizationRequestResponse,
  BUILT_IN_PARAMETERS
} from '@openid/appauth/built/authorization_request_handler';
import { AuthorizationResponse } from '@openid/appauth/built/authorization_response';
import { AuthorizationServiceConfiguration } from '@openid/appauth/built/authorization_service_configuration';
import { NodeCrypto } from '@openid/appauth/built/node_support/';
import { NodeBasedHandler } from '@openid/appauth/built/node_support/node_request_handler';
import { NodeRequestor } from '@openid/appauth/built/node_support/node_requestor';
import {
  GRANT_TYPE_AUTHORIZATION_CODE,
  GRANT_TYPE_REFRESH_TOKEN,
  TokenRequest
} from '@openid/appauth/built/token_request';
import {
  BaseTokenRequestHandler,
  TokenRequestHandler
} from '@openid/appauth/built/token_request_handler';
import {
  TokenError,
  TokenResponse
} from '@openid/appauth/built/token_response';
import EventEmitter = require('events');

import { log } from './logger';
import { StringMap } from '@openid/appauth/built/types';

import * as jwt from 'jsonwebtoken';
import * as jwksRsa from 'jwks-rsa';
import { ClientMeta } from './api';

export class AuthStateEmitter extends EventEmitter {
  static ON_TOKEN_RESPONSE = 'on_token_response';
}

export class AuthTenantInfo {
  claims: any | undefined;
  accessToken: string | undefined;
  idToken: string | undefined;
  errorMessage: string | undefined;
}

/* the Node.js based HTTP client. */
const requestor = new NodeRequestor();

/* an example open id connect provider */
const openIdConnectUrl = 'https://sod.superoffice.com/login';

/* client configuration */
const sod_jwks_uri = 'https://sod.superoffice.com/login/.well-known/jwks';
const sod_signing_key = 'Frf7jD-asGiFqADGTmTJfEq16Yw';
const redirectUri = 'http://127.0.0.1:4300/callback';
const port: number = 4300;
const scope = 'openid';

let clientId = '';
let clientSecret = '';
let clientMetadata: ClientMeta = undefined;

export class AuthFlow {
  private notifier: AuthorizationNotifier;
  private authorizationHandler: AuthorizationRequestHandler;
  private tokenHandler: TokenRequestHandler;
  readonly authStateEmitter: AuthStateEmitter;

  // state
  private configuration: AuthorizationServiceConfiguration | undefined;

  private refreshToken: string | undefined;
  private accessTokenResponse: TokenResponse | undefined;

  constructor() {
    this.notifier = new AuthorizationNotifier();
    this.authStateEmitter = new AuthStateEmitter();
    this.authorizationHandler = new NodeBasedHandler(port);
    this.tokenHandler = new BaseTokenRequestHandler(requestor);
    // set notifier to deliver responses
    this.authorizationHandler.setAuthorizationNotifier(this.notifier);
    // set a listener to listen for authorization responses
    // make refresh and access token requests.
    this.notifier.setAuthorizationListener((request, response, error) => {
      log('Authorization request complete ', request, response, error);
      if (response) {
        let codeVerifier: string | undefined;
        if (request.internal && request.internal.code_verifier) {
          codeVerifier = request.internal.code_verifier;
        }

        log('Calling makeRefreshTokenRequest');

        this.makeRefreshTokenRequest(response.code, codeVerifier)
          .then(result => this.performWithFreshTokens())
          .then((authTenantInfo: AuthTenantInfo) => {
            this.authStateEmitter.emit(
              AuthStateEmitter.ON_TOKEN_RESPONSE,
              authTenantInfo
            );
            log('All Done.');
          });
      }
    });
  }

  fetchServiceConfiguration(): Promise<void> {
    log('In fetchServiceConfiguration');

    return AuthorizationServiceConfiguration.fetchFromIssuer(
      openIdConnectUrl,
      requestor
    ).then(response => {
      log('Fetched service configuration', response);
      this.configuration = response;
    });
  }

  makeAuthorizationRequest(clientInfo: ClientMeta) {
    log('In makeAuthorizationRequest');

    if (!this.configuration) {
      log('Unknown service configuration');
      return;
    }

    clientId = clientInfo.id;
    clientSecret = clientInfo.secret;

    const extras: StringMap = { prompt: 'consent', access_type: 'offline' };

    // create a request
    const request = new AuthorizationRequest(
      {
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scope,
        response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
        state: undefined,
        extras: extras
      },
      new NodeCrypto()
    );

    log('Making authorization request ', this.configuration, request);

    this.authorizationHandler.performAuthorizationRequest(
      this.configuration,
      request
    );
  }

  private makeRefreshTokenRequest(
    code: string,
    codeVerifier: string | undefined
  ): Promise<void> {
    log('In makeRefreshTokenRequest');

    if (!this.configuration) {
      log('Unknown service configuration');
      return Promise.resolve();
    }

    const extras: StringMap = { client_secret: clientSecret };

    if (codeVerifier) {
      log('code verified!');
      extras.code_verifier = codeVerifier;
    }

    // use the code to make the token request.
    let request = new TokenRequest({
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
      code: code,
      refresh_token: undefined,
      extras: extras
    });

    return this.tokenHandler
      .performTokenRequest(this.configuration, request)
      .then(response => {
        log('Validating id_token...');
        this.refreshToken = response.refreshToken;
        this.accessTokenResponse = response;
        let claims = {};
        if (response.idToken) {
          claims = this.validateJwtToken(response.idToken);
        }
        log('Claims: ', claims);

        return response;
      })
      .then(() => {});
  }

  loggedIn(): boolean {
    return !!this.accessTokenResponse && this.accessTokenResponse.isValid();
  }

  signOut() {
    // forget all cached token state
    this.accessTokenResponse = undefined;
  }

  performWithFreshTokens(): Promise<AuthTenantInfo> {
    log('In performWithFreshTokens');

    if (!this.configuration) {
      log('Unknown service configuration');
      return Promise.reject('Unknown service configuration');
    }
    let authTenantInfo = new AuthTenantInfo();
    if (!this.refreshToken) {
      log('Missing refreshToken.');
      authTenantInfo.errorMessage = 'Missing refreshToken.';
      return Promise.resolve(authTenantInfo);
    }
    // only verifies expiration time
    if (
      this.accessTokenResponse &&
      this.accessTokenResponse.isValid() &&
      this.idTokenIsValid(this.accessTokenResponse, authTenantInfo)
    ) {
      return Promise.resolve(authTenantInfo);
    }

    const extras: StringMap = { client_secret: clientSecret };

    let request = new TokenRequest({
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: GRANT_TYPE_REFRESH_TOKEN,
      code: undefined,
      refresh_token: this.refreshToken,
      extras: extras
    });

    log('Calling performTokenRequest');

    return this.tokenHandler
      .performTokenRequest(this.configuration, request)
      .then(response => {
        this.accessTokenResponse = response;
        authTenantInfo.accessToken = response.accessToken;
        authTenantInfo.idToken = response.idToken;
        return authTenantInfo;
      });
  }
  idTokenIsValid(
    accessTokenResponse: TokenResponse,
    authTenantInfo: AuthTenantInfo
  ): boolean {
    authTenantInfo.accessToken = accessTokenResponse.accessToken;
    authTenantInfo.idToken = accessTokenResponse.idToken;
    this.validateJwtToken(accessTokenResponse.idToken)
      .then(result => {
        log('Valid Token!');
        authTenantInfo.claims = result;
        return true;
      })
      .catch(err => {
        log('Error validating token: ', err);
        return false;
      });

    return false;
  }

  async validateJwtToken(token: string | undefined): Promise<{}> {
    if (!token) {
      return {};
    }

    const soPublicKey = await this.getSigningKey();
    return await this.validateToken(token, soPublicKey);
  }

  async getSigningKey(): Promise<any> {
    return new Promise(function(resolve, reject) {
      var client = jwksRsa({
        cache: true,
        jwksUri: sod_jwks_uri
      });

      client.getSigningKey(sod_signing_key, function(err, key) {
        if (err) {
          reject(err);
        } else {
          var signingKey = key.publicKey || key.rsaPublicKey;
          resolve(signingKey);
        }
      });
    });
  }

  validateToken(token: string, publicKey: string) {
    return new Promise(function(resolve, reject) {
      var options = { ignoreExpiration: true, algorithm: ['RS256'] };

      jwt.verify(token, publicKey, options, function(err, decoded) {
        if (err) {
          reject(err);
        } else {
          console.log(JSON.stringify(decoded));
          resolve(decoded);
        }
      });
    });
  }
}
