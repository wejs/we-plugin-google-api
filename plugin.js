/**
 * Main We.js Google API integration plugin file
 */

const GA = require('./lib/index.js');

module.exports = function loadPlugin (projectPath, Plugin) {
  const plugin = new Plugin(__dirname);

  GA.init(plugin.we);
  plugin.GA = GA;

  plugin.setConfigs({
    googleApi: {
      scopes: {
        //'https://www.googleapis.com/auth/youtube.upload': true,
        //'https://www.googleapis.com/auth/youtube': true
      }
    },

    API_KEYS: {
      googleApi: { // configuration if not use system settings for configuration
        client_id: null,
        client_secret: null,
        redirect_uri: null
      }
    }
  });

  plugin.setRoutes({
    // authorization and refresh token restrival
    'get /auth/google-api/authenticate': {
      controller: 'googleApi',
      action: 'authenticate',
      permission: 'manage_google_api_tokens'
    },
    'get /auth/google-api/callback': {
      controller: 'googleApi',
      action: 'callback',
      permission: 'manage_google_api_tokens'
    },
  });

  /**
   * Plugin fast loader for speed up we.js projeto bootstrap
   *
   * @param  {Object}   we
   * @param {Function} done    callback
   */
  plugin.fastLoader = function (we, done) {
    // - Controllers:
    we.controllers.googleApi = new we.class.Controller({
      authenticate(req, res) {
        // authenticate to get refresh token
        GA.authenticate( (err, result)=> {
          if (err) return res.serverError(err);
          res.redirect(result.authUrl);
        });
      },

      callback(req, res) {
        if (!req.query.code) {
          req.we.log.warn('gogoleApi:Unknow response on receive refresh token:', req.query);
          return res.badRequest('we-plugin-google-api:callback.authorization.code.not.found');
        }

        GA.getTokenFromAuthorizationCode(req.query.code)
        .then( (tokens)=> {
          if (!tokens.refresh_token) {
            res.goTo('/');
          } else {
            // first auth, save the refresh_token:
            req.we.plugins['we-plugin-db-system-settings']
            .setConfigs({
              googleAccessToken: tokens.access_token,
              googleRefreshToken: tokens.refresh_token,
              googleTokenExpiryDate: tokens.expiry_date
            }, (err)=> {
              if (err) return res.queryError(err);
              res.addMessage('success', {
                text: 'we-plugin-google-api:authorization.success'
              });
              res.goTo('/');
            });
          }
        });
      }
    });

    // // - Models:
    // we.db.modelsConfigs['ga-access-token'] = {
    //   definition: {
    //     access_token: {
    //       type: we.db.Sequelize.TEXT,
    //       allowNull: true
    //     },
    //     refresh_token: {
    //       type: we.db.Sequelize.TEXT,
    //       allowNull: false
    //     },
    //     token_type: {
    //       type: we.db.Sequelize.STRING,
    //       allowNull: false
    //     },
    //     expiry_date: {
    //       type: we.db.Sequelize.INTEGER,
    //       allowNull: false
    //     },
    //     status: {
    //       type: we.db.Sequelize.INTEGER,
    //       allowNull: false,
    //       size: 3
    //     }
    //   },
    //   associations: {
    //     creator: {
    //       type: 'belongsTo',
    //       model: 'user'
    //     }
    //   },
    //   options: {
    //     tableName: 'ga_access_tokens'
    //   }
    // };

    done();
  };

  return plugin;
};
