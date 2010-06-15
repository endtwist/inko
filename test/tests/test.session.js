var sys = require('sys'),
    path = require('path');
require.paths.unshift(path.join(__dirname, '../..'));
require.paths.unshift(path.join(__dirname, '../../libs'));

var kiwi = require('kiwi');
kiwi.require('express', '= 0.13.0');
Object.merge(global, require('ext'));
require('express/spec');

Object.merge(global, require('settings'));
try { Object.merge(global, require('settings.local')); } catch(e) {}

var minitest = require('../minitest');
var assert = require('assert');

minitest.setupListeners();

minitest.context("Server#sessions", function() {
    this.setup(function() {
        run = function() {
          configure(Express.environment = 'test')
          Express.plugins.each(function(plugin){
            if ('init' in plugin.klass)
              plugin.klass.init(plugin.options)
          })
        };
        require('app');
    });
    
    this.assertion(
        "find the cookie session",
        function(test, _) {
            req('get', '/', {
                headers: {
                    cookie: 'sessionid=f270226ddfbffec3791b91c6120ee4b3'
                }
            }, _(function(req) {
                assert.equal(req.status, 200);
                test.finished();
            }))
        }
    );
    
    this.assertion(
        "redirect to login when no cookie session found",
        function(test, _) {
            req('get', '/', {}, _(function(req) {
                assert.equal(req.status, 303);
                test.finished();
            }));
        }
    );
    
    this.execute();
});