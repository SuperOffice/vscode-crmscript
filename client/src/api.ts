const open = require('open');
const open_darwin = require('mac-open');
const platform = process.platform;

import * as vscode from 'vscode';
import { ScriptMeta, CrmScriptProject } from './cirrusProject';
import { AuthFlow, AuthStateEmitter, AuthTenantInfo } from './flow';
import { log } from './logger';

import { Server, Path, GET, PathParam, QueryParam } from 'typescript-rest';
import { getCurrentFsPath } from './util';

var fs = require('fs');
var rp = require('request-promise');

export interface ClientMeta {
  id: string;
  secret: string;
  namespace: string;
}

var apiCode: string = undefined;
var tenant: string = undefined;
var client: ClientMeta = undefined;
const clientfile = 'client.json';

const authFlow: AuthFlow = new AuthFlow();
let authTent: AuthTenantInfo = undefined;

var loginStatusBarItem: vscode.StatusBarItem = undefined;

function initiateClient() {
  let clientfullpath = `${getCurrentFsPath()}/${clientfile}`;
  if (fs.existsSync(clientfullpath)) {
    let tmpclient = JSON.parse(fs.readFileSync(clientfullpath));
    if (tmpclient.id.length == 32 && tmpclient.secret.length == 32) {
      client = tmpclient;
      return tmpclient;
    } else {
      vscode.window.showWarningMessage(
        'Please provide valid client id and client secret'
      );
      vscode.commands.executeCommand(
        'vscode.open',
        vscode.Uri.file(clientfullpath)
      );
    }
  } else {
    client = {
      id: '<Client ID>',
      secret: '<ClientSecret>',
      namespace: '<namespace>'
    };
    fs.writeFile(clientfullpath, JSON.stringify(client, null, 2), err => {
      if (err) throw err;
      vscode.commands.executeCommand(
        'vscode.open',
        vscode.Uri.file(clientfullpath)
      );
      vscode.window.showWarningMessage(
        'Please provide the client id and client secret'
      );
    });
  }
  return undefined;
}

export function initApi() {
  if (!loginStatusBarItem) {
    loginStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
  }
  loginStatusBarItem.command = 'cirrus.login';
  loginStatusBarItem.text = 'Click SuperOffice Login';
  loginStatusBarItem.show();

  authFlow.authStateEmitter.on(
    AuthStateEmitter.ON_TOKEN_RESPONSE,
    resolveAuthentication
  );
}

//var configuration: AuthorizationServiceConfiguration | undefined;
export function login(username?: string): Promise<void> {
  if (!initiateClient()) {
    return;
  }

  log('Signing in...');
  if (!authFlow.loggedIn()) {
    return authFlow
      .fetchServiceConfiguration()
      .then(() => authFlow.makeAuthorizationRequest(client));
  } else {
    return Promise.resolve();
  }
}

function resolveAuthentication(authTenantInfo: AuthTenantInfo) {
  authTent = authTenantInfo;
  let accessToken = authTenantInfo.accessToken;

  //authTenantInfo.claims["iss"]
  //authTenantInfo.claims["iat"]
  //authTenantInfo.claims["nbf"]
  //authTenantInfo.claims["exp"]
  //authTenantInfo.claims["http://schemes.superoffice.net/identity/associateid"]
  //authTenantInfo.claims["http://schemes.superoffice.net/identity/email"]
  //authTenantInfo.claims["http://schemes.superoffice.net/identity/identityprovider"]
  //authTenantInfo.claims["http://schemes.superoffice.net/identity/is_administrator"]
  //authTenantInfo.claims["http://schemes.superoffice.net/identity/serial"]
  //authTenantInfo.claims["http://schemes.superoffice.net/identity/webapi_url"]
  //authTenantInfo.claims["http://schemes.superoffice.net/identity/netserver_url"]
  //authTenantInfo.claims["http://schemes.superoffice.net/identity/upn"]
  tenant = authTenantInfo.claims['http://schemes.superoffice.net/identity/ctx'];

  log('AuthTenantInfo', authTenantInfo);

  //@todo: move this out of the api...
  if (!loginStatusBarItem) {
    loginStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
  }

  loginStatusBarItem.text = `Logged in to ${tenant}`;
  loginStatusBarItem.command = undefined;
  loginStatusBarItem.show();
}

export function listAllScripts(callback: (string) => void) {
  let options = {
    uri: `https://sod.superoffice.com/${tenant}/api/v1/Script/`,
    headers: {
      Authorization: `Bearer ${authTent.accessToken}`,
      Accept: 'application/json'
    }
  };
  rp(options)
    .then(res => {
      let values = JSON.stringify(JSON.parse(res).value);
      callback(values);
    })
    .catch(err => {
      console.error('Error:', err);
    });
}

export function getScriptSource(
  meta: ScriptMeta,
  callback: (string) => void
): string {
  if (!meta.uniqueIdentifier) return undefined;
  let options = {
    uri: `https://sod.superoffice.com/${tenant}/api/v1/Script/${
      meta.uniqueIdentifier
    }`,
    headers: {
      Authorization: `Bearer ${authTent.accessToken}`,
      Accept: 'application/json'
    }
  };
  rp(options)
    .then(res => {
      let sourcecode = JSON.parse(res).Source;
      callback(sourcecode);
    })
    .catch(err => {
      console.error('ERROR: ', err);
    });
}

export function uploadScriptSource(
  meta: ScriptMeta,
  text: string,
  post: (res: any) => void
) {
  //@todo!!
  let options = {
    method: 'PUT',
    uri: `https://sod.superoffice.com/${tenant}/api/v1/Script/${
      meta.uniqueIdentifier ? meta.uniqueIdentifier : ''
    }`,
    headers: {
      Authorization: `Bearer ${authTent.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: {
      Source: text,
      UniqueIdentifier: meta.uniqueIdentifier,
      Name: meta.name,
      Description: meta.description,
      IncludeId: meta.includeId,
      Path: meta.path
    },
    json: true
  };
  if (!options.body.UniqueIdentifier) delete options.body.UniqueIdentifier;
  console.log(`upload ${options.uri}`);
  rp(options)
    .then(res => {
      if (post) post(res);
    })
    .catch(err => {
      console.log(err);
    });
}

export function deleteScript(meta: ScriptMeta, post: (res: any) => void) {
  //@todo!!
  let options = {
    method: 'DELETE',
    uri: `https://sod.superoffice.com/${tenant}/api/v1/Script/${
      meta.uniqueIdentifier
    }`,
    headers: {
      Authorization: `Bearer ${authTent.accessToken}`,
      'Content-Type': 'application/json'
    }
  };
  rp(options)
    .then(res => {
      if (post) post(res);
    })
    .catch(err => {
      console.log(err);
    });
}

export function executeScript(meta: ScriptMeta, post: (res: any) => void) {
  let options = {
    uri: `https://sod.superoffice.com/${tenant}/api/v1/CRMScript/${
      meta.ejscriptId
    }/Execute`,
    headers: {
      Authorization: `Bearer ${authTent.accessToken}`,
      'Content-Type': 'application/json'
    }
  };
  console.log(options.uri);
  rp(options)
    .then(res => {
      if (post) post(res);
    })
    .catch(err => {
      console.log(err);
    });
}

export function getNameSpace() {
  initiateClient();
  return client.namespace;
}

export function getTenant() {
  return tenant;
}
