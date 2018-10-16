import { Issuer } from 'openid-client'
const open = require('open');
const open_darwin = require('mac-open');
const platform = process.platform;
import * as vscode from 'vscode'
import {ScriptMeta, CrmScriptProject} from './cirrusProject'


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
var rp = require('request-promise');
import * as express from "express";
import { Server, Path, GET, PathParam, QueryParam } from "typescript-rest";
import {getCurrentFsPath} from './util'

export interface ClientMeta{
    id: string;
    secret: string;
    namespace: string;
}

var apiCode: string = undefined;
var apiToken: TokenResponse = undefined;
var tenant: string = undefined;
var client: ClientMeta = undefined;
const redirect_uri = 'http://localhost:4300/callback'
const clientfile = 'client.json'

const requestor = new NodeRequestor();
var configuration: AuthorizationServiceConfiguration = undefined;

var loginStatusBarItem: vscode.StatusBarItem = undefined;

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
        client = {id: "<Client ID>", secret:"<ClientSecret>", namespace: "<namespace>"};
        fs.writeFile(clientfullpath, JSON.stringify(client, null, 2), (err)=>{
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
        {'client_secret': client.secret}
    );

    tokenHandler.performTokenRequest(configuration, request)
    .then(response => {
        apiToken = response;
        let accessToken = apiToken.accessToken
        tenant = accessToken.substring(accessToken.indexOf(':')+1, accessToken.indexOf('.'))
        console.log(response)
        console.log(tenant)

        //@todo: move this out of the api...
        if(!loginStatusBarItem){
            loginStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
        }
        loginStatusBarItem.text = `Logged in to ${tenant}`
        loginStatusBarItem.show()
    });
}

export function login_old() {

    const superofficeIssuer = new Issuer({
        issuer: 'https://sod.superoffice.com',
        authorization_endpoint: 'https://sod.superoffice.com/login/common/oauth/authorize',
        token_endpoint: 'https://sod.superoffice.com/login/common/oauth/tokens',
        userinfo_endpoint: 'https://sod.superoffice.com/login/common/oauth/userinfo',
        jwks_uri: 'https://sod.superoffice.com/login/.well-known/jwks',
    }); // => Issuer
    console.log('Set up issuer %s %O', superofficeIssuer.issuer, superofficeIssuer.metadata);

    const client = new superofficeIssuer.Client({
        client_id: 'b703dda25fc5bf46c78575ca2f241d87',
        client_secret: '24767c27ed056d6ca4908bc7ce2dc4d5'
    });

    var authurl = client.authorizationUrl({
        redirect_uri: 'http://localhost:4300/callback',
        scope: 'openid email',
    });
    if (platform === 'darwin') {
        open_darwin(authurl)
    }
    else // Now only Mac and Windowns
        open(authurl) 
        //vscode.commands.executeCommand('vscode.open', authurl)
    return authurl
}

@Path("/callback")
class HelloService {    
    @GET
    sayHello(@QueryParam('state') state: string, @QueryParam('code') code: string): string {
        apiCode = code;
        //console.log(code);
        tokenRequest();
        return `Login successfully. Happy Scripting!`;
    }
}
export function openCallBackServer() {
   
    let app: express.Application = express();
    Server.buildServices(app);

    app.listen(4300, function () {
        console.log('Callback Server listening on localhost:4300!');
    });

}


export function listAllScripts(callback: (string)=>void){
    let options = {
        uri: `https://sod.superoffice.com/${tenant}/api/v1/Script/`,
        headers: {
            'Authorization': `Bearer ${apiToken.accessToken}`,
            'Accept': 'application/json'
        }
    };
    rp(options).then((res)=>{
        //console.log(res)
        let values = JSON.stringify(JSON.parse(res).value)
        callback(values)
    })
}

export function getScriptSource(meta: ScriptMeta, callback: (string)=>void): string{
    if(!meta.uniqueIdentifier)
        return undefined;
    let options = {
        uri: `https://sod.superoffice.com/${tenant}/api/v1/Script/${meta.uniqueIdentifier}`,
        headers: {
            'Authorization': `Bearer ${apiToken.accessToken}`,
            'Accept': 'application/json'
        }
    };
    rp(options).then((res)=>{
        let sourcecode = JSON.parse(res).Source
        callback(sourcecode)
    })
}

export function uploadScriptSource(meta: ScriptMeta, text: string, post: (res: any)=>void){
    //@todo!!
    let options = {
        method: 'PUT',
        uri: `https://sod.superoffice.com/${tenant}/api/v1/Script/${meta.uniqueIdentifier}`,
        headers: {
            'Authorization': `Bearer ${apiToken.accessToken}`,
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
    }
    rp(options).then((res)=>{
        if(post)
            post(res)
    }).catch((err)=>{
        console.log(err)
    })
}

export function deleteScript(meta: ScriptMeta, post: (res: any)=>void){
    //@todo!!
    let options = {
        method: 'DELETE',
        uri: `https://sod.superoffice.com/${tenant}/api/v1/Script/${meta.uniqueIdentifier}`,
        headers: {
            'Authorization': `Bearer ${apiToken.accessToken}`,
            'Content-Type': 'application/json'
        }
    }
    rp(options).then((res)=>{
        if(post)
            post(res)
    }).catch((err)=>{
        console.log(err)
    })
}

export function getNameSpace(){
    initiateClient();
    return client.namespace;

}

export function getTenant(){
    return tenant
}