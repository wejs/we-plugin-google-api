const { google } = require('googleapis');

const GA = {
  we: null,
  oAuth2Client: null,
  google: google,

  init(we) {
    this.we = we;

    we.hooks.on('system-settings:started', function (we, done) {
      GA.configure();
      done();
    });

    we.events.on('system-settings:updated:after', function (we) {
      GA.configure(we);
    });
  },

  configure() {
    try {
      const hostname = this.we.config.hostname;
      const gaConfig = this.we.config.API_KEYS.googleApi;
      const ss = this.we.systemSettings || {};

      this.oAuth2Client = new google.auth.OAuth2(
        ss.googleApiClientID || gaConfig.client_id,
        ss.googleApiClientSecret || gaConfig.client_secret,
        ss.googleApiRedirectUri || gaConfig.redirect_uri || hostname+'/auth/google-api/callback'
      );

      // set auth as a global default
      google.options({ auth: this.oAuth2Client });

      if (ss.googleRefreshToken) {
        this.oAuth2Client.credentials = {
          access_token: ss.googleAccessToken,
          refresh_token: ss.googleRefreshToken,
          expiry_date: ss.googleTokenExpiryDate
        };

        this.refreshAccessTokenIfNeed((err)=>{
          if (err) this.we.log.error('we-plugin-google-api:configure:refreshAccessToken:error', err);
        });
      }
    } catch (e) {
      this.we.log.error('we-plugin-google-api:configure:error', e);
    }
  },

  getScopes(asString) {
    const scopesCfg = this.we.config.googleApi.scopes;

    const scopes = [];

    for (let scope in scopesCfg) {
      if (scopesCfg[scope]) scopes.push(scope);
    }

    if (asString) {
      return scopes.join(' ');
    } else {
      return scopes;
    }
  },

  authenticate(cb) {
    // grab the url that will be used for authorization
    const authorizeUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.getScopes(true)
    });

    cb(null, { authUrl: authorizeUrl });
  },

  getTokenFromAuthorizationCode(authCode) {
    return new Promise( (resolve, reject)=> {
      if (!authCode) {
        return reject('we-plugin-google-api:getTokenFromAuthorizationCode:authcode.required');
      }

      this.oAuth2Client
      .getToken(authCode)
      .then( (result)=> {
        this.oAuth2Client.credentials = result.tokens;
        resolve(result.tokens);
      })
      .catch(reject);
    });
  },

  refreshAccessToken(cb) {
    this.oAuth2Client.refreshAccessToken()
    .then( (response)=> {
      this.we.plugins['we-plugin-db-system-settings']
      .setConfigs({
        googleAccessToken: response.credentials.access_token,
        googleRefreshToken: response.credentials.refresh_token,
        googleTokenExpiryDate: response.credentials.expiry_date
      }, function(){});

      cb(null, response.credentials);
    })
    .catch(cb);
  },

  refreshAccessTokenIfNeed(cb) {
    if (
      !this.oAuth2Client.credentials ||
      !this.oAuth2Client.credentials.access_token ||
      this.oAuth2Client.isTokenExpiring()
    ) {
      this.refreshAccessToken(cb);
    } else {
      cb();
    }
  }
};

module.exports = GA;
