const assert = require('assert'),
  request = require('supertest'),
  helpers = require('we-test-tools').helpers;

let http, we, agent;

describe('googleApiAuthRequests', function () {
  before(function (done) {
    http = helpers.getHttp();
    agent = request.agent(http);
    we = helpers.getWe();
    done();
  });

  describe('index', function () {
    it('get /auth/google/authenticate get authorization token');
  });
});
