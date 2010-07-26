var sys = require('sys'),
    path = require('path');
require.paths.unshift(require.paths[0] + '/express-0.14.1');
require.paths.unshift(path.join(__dirname, '../..'));
require.paths.unshift(path.join(__dirname, '../../libs'));

require('express-0.14.1');
Object.merge(global, require('ext'));

var minitest = require('../minitest');
var assert = require('assert');

minitest.setupListeners();

minitest.context("Room", function() {
    var self;

    this.setup(function() {
        self = this;
        this.chat = require('../../chat');
        this.manager = this.chat.manager;

        // If we don't clear the interval, the tests hang?
        clearInterval(this.manager.grim_reaper);
    });

    this.assertion(
        "creating a new Room with agent and guest works",
        function(test) {
            var dummyGuest = {
                    type: 'guest',
                    get: function() { return ''; },
                    result: [],
                    respond: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    notify: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    hasPerm: function() { return false; }
                },
                dummyAgent = {
                    type: 'agent',
                    available: true,
                    assignGuest: function(guest) { this._guest = guest; },
                    get: function() { return ''; },
                    result: [],
                    respond: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    notify: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    hasPerm: function() { return false; }
                },
                room = new this.chat.Room(dummyAgent, dummyGuest);

            assert.equal(dummyGuest.result[0][0].type, 'joined');
            assert.equal(dummyAgent.result[0][0].type, 'joined');

            assert.equal(JSON.parse(dummyGuest.result[1][0]).type,
                         'notification');
            assert.equal(JSON.parse(dummyAgent.result[1][0]).type,
                         'notification');

            assert.ok(room._private);
            test.finished();
        }
    );

    this.assertion(
        "creating a new Room without guest works",
        function(test) {
            var genDummyAgent = function() { return {
                    type: 'agent',
                    available: true,
                    assignGuest: function(guest) { this._guest = guest; },
                    get: function() { return ''; },
                    result: [],
                    respond: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    notify: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    hasPerm: function() { return false; }
                }; },
                dummyAgent1 = genDummyAgent(),
                dummyAgent2 = genDummyAgent(),
                room = new this.chat.Room([dummyAgent1, dummyAgent2]);

            assert.equal(JSON.parse(dummyAgent1.result[0][0]).type,
                         'notification');
            assert.equal(JSON.parse(dummyAgent2.result[0][0]).type,
                         'notification');

            assert.strictEqual(room._private, false);
            test.finished();
        }
    );

    this.assertion(
        "joining a private Room without the right permissions returns error",
        function(test) {
            var dummyGuestGen = function() { return {
                    type: 'guest',
                    get: function() { return ''; },
                    result: [],
                    respond: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    notify: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    hasPerm: function() { return false; }
                }; },
                dummyGuest1 = dummyGuestGen(),
                dummyGuest2 = dummyGuestGen(),
                dummyAgent = {
                    type: 'agent',
                    available: true,
                    assignGuest: function(guest) { this._guest = guest; },
                    get: function() { return ''; },
                    result: [],
                    respond: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    notify: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    hasPerm: function() { return false; }
                },
                room = new this.chat.Room(dummyAgent, dummyGuest1);

            room.join(dummyGuest2);

            assert.equal(dummyGuest2.result[0][0].type, 'error');
            assert.equal(dummyGuest2.result[0][0].error, 'no permissions');
            test.finished();
        }
    );

    this.assertion(
        "joining a public Room twice returns an error",
        function(test) {
            var dummyGuest = {
                    type: 'guest',
                    get: function() { return ''; },
                    result: [],
                    respond: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    notify: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    hasPerm: function() { return false; }
                },
                dummyAgent = {
                    type: 'agent',
                    available: true,
                    assignGuest: function(guest) { this._guest = guest; },
                    get: function() { return ''; },
                    result: [],
                    respond: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    notify: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    hasPerm: function() { return false; }
                },
                room = new this.chat.Room([dummyAgent, dummyGuest]);

            dummyGuest.result = [];
            room.join(dummyGuest);

            assert.equal(dummyGuest.result[0][0].type, 'error');
            assert.equal(dummyGuest.result[0][0].error, 'already in room');
            test.finished();
        }
    );

    this.assertion(
        "leaving a Room works",
        function(test) {
            var dummyGuest = {
                    type: 'guest',
                    get: function() { return ''; },
                    result: [],
                    respond: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    notify: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    hasPerm: function() { return false; }
                },
                dummyAgent = {
                    type: 'agent',
                    available: true,
                    assignGuest: function(guest) { this._guest = guest; },
                    get: function() { return ''; },
                    result: [],
                    respond: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    notify: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    hasPerm: function() { return false; }
                },
                room = new this.chat.Room([dummyAgent, dummyGuest]);

            dummyGuest.result = [];
            room.leave(dummyGuest);

            assert.equal(dummyGuest.result[0][0].type, 'left');
            test.finished();
        }
    );

    this.assertion(
        "leaving a Room you aren't in gives an error",
        function(test) {
            var dummyGuest = {
                    type: 'guest',
                    get: function() { return ''; },
                    result: [],
                    respond: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    notify: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    hasPerm: function() { return false; }
                },
                dummyAgent = {
                    type: 'agent',
                    available: true,
                    assignGuest: function(guest) { this._guest = guest; },
                    get: function() { return ''; },
                    result: [],
                    respond: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    notify: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    hasPerm: function() { return false; }
                },
                room = new this.chat.Room([dummyAgent]);

            dummyGuest.result = [];
            room.leave(dummyGuest);

            assert.equal(dummyGuest.result[0][0].type, 'error');
            assert.equal(dummyGuest.result[0][0].error, 'not in room');
            test.finished();
        }
    );

    this.assertion(
        "send broadcasts a message to all users in a public room",
        function(test) {
            var genDummyAgent = function() { return {
                    type: 'agent',
                    available: true,
                    assignGuest: function(guest) { this._guest = guest; },
                    get: function() { return ''; },
                    result: [],
                    respond: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    notify: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    hasPerm: function() { return false; }
                }; },
                dummyAgent1 = genDummyAgent(),
                dummyAgent2 = genDummyAgent(),
                room = new this.chat.Room([dummyAgent1, dummyAgent2]);

            dummyAgent1.result = [];
            dummyAgent2.result = [];
            room.send(new this.chat.Message(dummyAgent1, 'Test'));

            assert.equal(dummyAgent1.result[1][0].type, 'success');
            assert.equal(dummyAgent1.result[1][0].success, 'message sent');
            assert.equal(JSON.parse(dummyAgent2.result[0][0]).body, 'Test');
            test.finished();
        }
    );
    
    this.assertion(
        "send broadcasts a message to all users in a private room",
        function(test) {
            var dummyGuest = {
                    type: 'guest',
                    get: function() { return ''; },
                    result: [],
                    respond: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    notify: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    hasPerm: function() { return false; }
                },
                dummyAgent = {
                    type: 'agent',
                    available: true,
                    assignGuest: function(guest) { this._guest = guest; },
                    get: function() { return ''; },
                    result: [],
                    respond: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    notify: function() {
                        this.result.push(Array.prototype.slice.call(arguments));
                    },
                    hasPerm: function() { return false; }
                },
                room = new this.chat.Room(dummyAgent, dummyGuest);

            dummyAgent.result = [];
            dummyGuest.result = [];
            room.send(new this.chat.Message(dummyAgent, 'Test'));

            assert.equal(dummyAgent.result[1][0].type, 'success');
            assert.equal(dummyAgent.result[1][0].success, 'message sent');
            assert.equal(JSON.parse(dummyGuest.result[0][0]).body, 'Test');
            test.finished();
        }
    );
});