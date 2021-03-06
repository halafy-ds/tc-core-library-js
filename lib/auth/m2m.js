'use strict'
var _ = require('lodash'),
  request = require('request'),
  jwt = require('jsonwebtoken')

const getTokenExpiryTime = function (token) {
  let expiryTime = 0
  if (token) {
    let decodedToken = jwt.decode(token)
    let expiryTimeInMilliSeconds = (decodedToken.exp - 60) * 1000 - (new Date().getTime())
    expiryTime = Math.floor(expiryTimeInMilliSeconds / 1000)
  }
  return expiryTime
}

let cachedToken = {}

module.exports = function (config) {
  let auth0Url = _.get(config, 'AUTH0_URL', '')
  let auth0Audience = _.get(config, 'AUTH0_AUDIENCE', '')
  let auth0ProxyServerUrl = _.get(config, 'AUTH0_PROXY_SERVER_URL', auth0Url)
  
  return {

    /**
     * Generate machine to machine token from Auth0
     * V3 API specification
     * @param  clientId  client Id provided from Auth0
     * @param  clientSecret  client secret provided from Auth0
     * @return  Promise  promise to pass responses
     */
    getMachineToken: (clientId, clientSecret) => {

      var options = {
        url: auth0ProxyServerUrl,
        headers: { 'content-type': 'application/json' },
        body: {
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          audience: auth0Audience,
          auth0_url: auth0Url
        },
        json: true
      }

      return new Promise(function (resolve, reject) {

        // We cached the token to cachedToken variable,
        // So we check the variable and the time here.
        let appCachedToken = cachedToken[clientId]
        let appCachedTokenExpired = false

        //Check the token expiry  
        if (appCachedToken) {
          if (getTokenExpiryTime(appCachedToken) <= 0) {
            appCachedTokenExpired = true
          }
        }
        if (!appCachedToken || appCachedTokenExpired ) {
            request.post(options, function (error, response, body) {
              if (error) {
                return reject(new Error(error))
              }
              if (body.access_token) {
                cachedToken[clientId] = body.access_token
                resolve(cachedToken[clientId])
              } else if (body.error && body.error_description) {
                reject(new Error(
                body.error + ': ' + body.error_description +
                ' ;Please check your auth credential i.e. AUTH0_URL, AUTH0_CLIENT_ID,' +
                ' AUTH0_CLIENT_SECRET, AUTH0_AUDIENCE, AUTH0_PROXY_SERVER_URL')
                )
              } else {
                reject(new Error(body))
              }
            })
        }
        else {
          resolve(appCachedToken)
        }
      })
    }

  }
}
