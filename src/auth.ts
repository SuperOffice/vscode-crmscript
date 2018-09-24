import { Issuer } from 'openid-client'
const open = require('open');
const open_darwin = require('mac-open');
const platform = process.platform;

export function login(){

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
    if(platform === 'darwin'){
        open_darwin(authurl)
    }
    

    return authurl
}