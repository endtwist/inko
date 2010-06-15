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

minitest.context("DjangoSession", function() {
    this.setup(function() {
        this.ds = require('models').DjangoSession;
    });
    
    this.assertion(
        "should retrieve a user's data based on a Django session id",
        function(test, _) {
            new this.ds('f270226ddfbffec3791b91c6120ee4b3',
                function(user_id) {
                    assert.ok(user_id);
                    assert.equal(this.username, 'jgross');
                    test.finished();
                }
            );
        }
    );
    
    this.execute();
});