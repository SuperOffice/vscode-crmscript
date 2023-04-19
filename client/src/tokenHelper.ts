import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

function getSigningKey(jwks_uri) {
  return new Promise(function(resolve, reject) {
    var jwksUrl = jwks_uri;
    var client = jwksClient({ jwksUri: jwksUrl });
    client.getKeys(function(err, keys) {
      if(err) {
        reject(err);
      } else {
        // get the first and only key
        client.getSigningKey(keys[0].kid, function(inerr, key) {
          if (inerr) {
            reject(inerr);
          } else {
            var signingKey = key.getPublicKey();
            resolve(signingKey);
          }
        });
      }
    });
  });
}

function validateToken(token, publicKey) {
  return new Promise(function(resolve, reject) {
    var options = { ignoreExpiration: true, algorithm: ["RS256"] };

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

 export async function validateJwtToken (token, jwks_uri) {
  var soPublicKey = await getSigningKey(jwks_uri);
  var validatedToken = await validateToken(token, soPublicKey);
  return validatedToken;
};