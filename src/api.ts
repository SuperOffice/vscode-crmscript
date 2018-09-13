import { Issuer } from 'openid-client'
const open = require('open');
const open_darwin = require('mac-open');
const platform = process.platform;
import * as vscode from 'vscode'


import { AuthorizationRequest } from "@openid/appauth/built/authorization_request";
import {
  AuthorizationNotifier,
  AuthorizationRequestHandler,
  AuthorizationRequestResponse,
  BUILT_IN_PARAMETERS
} from "@openid/appauth/built/authorization_request_handler";
import { AuthorizationResponse } from "@openid/appauth/built/authorization_response";
import { AuthorizationServiceConfiguration } from "@openid/appauth/built/authorization_service_configuration";
import { NodeBasedHandler } from "@openid/appauth/built/node_support/node_request_handler";
import { NodeRequestor } from "@openid/appauth/built/node_support/node_requestor";
import {
  GRANT_TYPE_AUTHORIZATION_CODE,
  GRANT_TYPE_REFRESH_TOKEN,
  TokenRequest
} from "@openid/appauth/built/token_request";
import {
  BaseTokenRequestHandler,
  TokenRequestHandler
} from "@openid/appauth/built/token_request_handler";
import {
  TokenError,
  TokenResponse
} from "@openid/appauth/built/token_response";

//import EventEmitter = require("events");
import { StringMap } from "@openid/appauth/built/types";

// export class AuthStateEmitter extends EventEmitter {
//   static ON_TOKEN_RESPONSE = "on_token_response";
// }
var fs = require('fs')
import * as express from "express";
import { Server, Path, GET, PathParam, QueryParam } from "typescript-rest";
import {getCurrentFsPath} from './util'

export interface ClientMeta{
    id: string;
    secret: string;
}

var apiCode: string = undefined;
var apiToken: object = undefined;
var client: ClientMeta = undefined;
const redirect_uri = 'http://localhost:4300/callback'
const clientfile = 'client.json'

const requestor = new NodeRequestor();
var configuration: AuthorizationServiceConfiguration = undefined;

function initiateClient(){
    let clientfullpath = `${getCurrentFsPath()}/${clientfile}`;
    if(fs.existsSync(clientfullpath)){
        let tmpclient = JSON.parse(fs.readFileSync(clientfullpath))
        if(tmpclient.id.length == 32 && tmpclient.secret.length == 32){
            client = tmpclient;
            return tmpclient;
        }
        else{
            vscode.window.showWarningMessage("Please provide valid client id and client secret");
            vscode.commands.executeCommand('vscode.open', vscode.Uri.file(clientfullpath));
        }
    }
    else{
        this.client = {id: "<Client ID>", secret:"<ClientSecret>"};
        fs.writeFile(clientfullpath, JSON.stringify(this.client, null, 2), (err)=>{
            if(err) throw err;
            vscode.commands.executeCommand('vscode.open', vscode.Uri.file(clientfullpath));
            vscode.window.showWarningMessage("Please provide the client id and client secret");
        });
        
    }
    return undefined;
}


//var configuration: AuthorizationServiceConfiguration | undefined;
export function login(){

    if(! initiateClient()){
        return;
    }

    configuration = AuthorizationServiceConfiguration.fromJson(
        {
            authorization_endpoint: "https://sod.superoffice.com/login/common/oauth/authorize",
            token_endpoint: "https://sod.superoffice.com/login/common/oauth/tokens",
            revocation_endpoint: "https://sod.superoffice.com/login/.well-known/jwks",
            userinfo_endpoint: "https://sod.superoffice.com/login/common/oauth/userinfo"
        }
    )

    let request = new AuthorizationRequest(
        client.id,
        redirect_uri,
        'openid profile api webapi',
        AuthorizationRequest.RESPONSE_TYPE_CODE,
        undefined, /* state */
        {'prompt': 'consent', 'access_type': 'offline'});

    let authorizationHandler = new NodeBasedHandler();
    authorizationHandler.performAuthorizationRequest(configuration, request);
    
}

export function tokenRequest(){
    let tokenHandler = new BaseTokenRequestHandler(requestor);
 
    let request: TokenRequest|null = null;
 

  // use the code to make the token request.
  request = new TokenRequest(
    client.id, redirect_uri, GRANT_TYPE_AUTHORIZATION_CODE, apiCode, undefined,
      {'client_secret': client.secret});

    
    tokenHandler.performTokenRequest(configuration, request)
    .then(response => {
        apiToken = response;
        console.log(response);
    });
}

// export function login_old() {

//     const superofficeIssuer = new Issuer({
//         issuer: 'https://sod.superoffice.com',
//         authorization_endpoint: 'https://sod.superoffice.com/login/common/oauth/authorize',
//         token_endpoint: 'https://sod.superoffice.com/login/common/oauth/tokens',
//         userinfo_endpoint: 'https://sod.superoffice.com/login/common/oauth/userinfo',
//         jwks_uri: 'https://sod.superoffice.com/login/.well-known/jwks',
//     }); // => Issuer
//     console.log('Set up issuer %s %O', superofficeIssuer.issuer, superofficeIssuer.metadata);

//     const client = new superofficeIssuer.Client({
//         client_id: 'b703dda25fc5bf46c78575ca2f241d87',
//         client_secret: '24767c27ed056d6ca4908bc7ce2dc4d5'
//     });

//     var authurl = client.authorizationUrl({
//         redirect_uri: 'http://localhost:4300/callback',
//         scope: 'openid email',
//     });
//     if (platform === 'darwin') {
//         open_darwin(authurl)
//     }
//     else // Now only Mac and Windowns
//         open(authurl) 
//         //vscode.commands.executeCommand('vscode.open', authurl)


//     return authurl
// }

@Path("/callback")
class HelloService {
    
    @GET
    sayHello(@QueryParam('state') state: string, @QueryParam('code') code: string): string {
        apiCode = code;
        console.log(code);
        tokenRequest();
        return `Login successful, with code: ${code}`;
    }
}
export function openCallBackServer() {
   
    let app: express.Application = express();
    Server.buildServices(app);

    app.listen(4300, function () {
        console.log('Callback Server listening on localhost:4300!');
    });

}