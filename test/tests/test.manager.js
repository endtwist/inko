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

minitest.context("Manager", function() {
    var self;

    this.setup(function() {
        self = this;
        this.chat = require('../../chat');
        this.manager = this.chat.manager;

        // If we don't clear the interval, the tests hang?
        clearInterval(this.manager.grim_reaper);
    });

    this.assertion(
        "queueGuest puts the guest in the queue",
        function(test) {
            var dummyGuest = {get: function() { return ''; }};
            this.manager.events.addListener('message',
                function(package) {
                    assert.ok(package instanceof self.chat.Update);
                    assert.equal(package.details, 'queued');
                    test.finished();
                });
            this.manager.queueGuest(dummyGuest);
            assert.equal(this.manager.guests[0], dummyGuest);

            this.manager.guests = []; // reset.
            this.manager.events.removeAllListeners('message');
        }
    );

    this.assertion(
        "dequeueGuest removes a guest from the queue",
        function(test) {
            var dummyGuest = {get: function() { return ''; }};
            this.manager.queueGuest(dummyGuest);

            this.manager.events.addListener('message',
                function(package) {
                    assert.ok(package instanceof self.chat.Update);
                    assert.equal(package.details, 'dequeued');
                    test.finished();
                });
            var guest = this.manager.dequeueGuest();
            assert.equal(guest, dummyGuest);

            this.manager.events.removeAllListeners('message');
        }
    );

    this.assertion(
        "'queue' returns a JSON string of all queued guests",
        function(test) {
            var dummyGuest = {
                get: function() {},
                toString: function() { return 'test' }
            };
            this.manager.queueGuest(dummyGuest);

            assert.equal(this.manager.queue, '["test"]');
            test.finished();

            this.manager.guests = []; // reset.
        }
    );

    this.assertion(
        "defineGuest sets a new guest's data and queue them",
        function(test) {
            var dummyGuest = {
                type: 'guest',
                data: null,
                get: function() { return ''; },
                respond: function() {
                    this._result = Array.prototype.slice.call(arguments);
                }
            };

            this.manager.events.addListener('message',
                function(package) {
                    assert.ok(package instanceof self.chat.Update);
                    assert.equal(package.details, 'queued');
                    test.finished();
                });
            this.manager.defineGuest(dummyGuest, {
                username: 'test',
                question: 'question?',
                os: 'os',
                version: '1.0',
                extensions: 'none'
            });
            assert.equal(dummyGuest._result[0].type, 'success');
            assert.equal(this.manager.guests[0], dummyGuest);

            this.manager.guests = []; // reset.
            this.manager.events.removeAllListeners('message');
        }
    );

    this.assertion(
        "if not all data in defineGuest is set, return error",
        function(test) {
            var dummyGuest = {
                type: 'guest',
                data: null,
                get: function() { return ''; },
                respond: function() {
                    this._result = Array.prototype.slice.call(arguments);
                }
            };

            this.manager.defineGuest(dummyGuest, {});
            assert.equal(dummyGuest._result[0].type, 'error');
            assert.equal(dummyGuest._result[0].error, 'missing data');
            assert.equal(this.manager.guests.length, 0);
            test.finished();

            this.manager.events.removeAllListeners('message');
        }
    );

    this.assertion(
        "assignNextGuestToThisAgent assigns queued guest to agent",
        function(test) {
            var dummyGuest = {
                    type: 'guest',
                    get: function() { return ''; },
                    respond: function() {
                        this._result = Array.prototype.slice.call(arguments);
                    },
                    notify: function() {
                        this._result = Array.prototype.slice.call(arguments);
                    },
                    hasPerm: function() { return false; }
                },
                dummyAgent = {
                    type: 'agent',
                    available: true,
                    assignGuest: function(guest) { this._guest = guest; },
                    get: function() { return ''; },
                    respond: function() {
                        this._result = Array.prototype.slice.call(arguments);
                    },
                    notify: function() {
                        this._result = Array.prototype.slice.call(arguments);
                    },
                    hasPerm: function() { return true; }
                };
            this.manager.queueGuest(dummyGuest);

            assert.notStrictEqual(
                this.manager.assignNextGuestToThisAgent(dummyAgent),
                false);
            assert.equal(dummyAgent._guest, dummyGuest);
            test.finished();

            this.manager.guests = []; // reset.
        }
    );

    this.assertion(
        "assigning guest to a guest with assignNextGuestToThisAgent fails",
        function(test) {
            var dummyGuest = {
                    type: 'guest',
                    get: function() { return ''; },
                    respond: function() {
                        this._result = Array.prototype.slice.call(arguments);
                    },
                    notify: function() {
                        this._result = Array.prototype.slice.call(arguments);
                    },
                    hasPerm: function() { return false; }
                };
            assert.strictEqual(
                this.manager.assignNextGuestToThisAgent(dummyGuest),
                false);
            assert.equal(dummyGuest._result[0].error, 'not an agent');
            test.finished();

            this.manager.guests = []; // reset.
        }
    );
    
    this.assertion(
        "if queue list is empty, assignNextGuestToThisAgent fails",
        function(test) {
            var dummyAgent = {
                    type: 'agent',
                    available: true,
                    assignGuest: function(guest) { this._guest = guest; },
                    get: function() { return ''; },
                    respond: function() {
                        this._result = Array.prototype.slice.call(arguments);
                    },
                    notify: function() {
                        this._result = Array.prototype.slice.call(arguments);
                    },
                    hasPerm: function() { return true; }
                };
            assert.strictEqual(
                this.manager.assignNextGuestToThisAgent(dummyAgent),
                false);
            assert.equal(dummyAgent._result[0].error, 'no queued guests');
            test.finished();
        }
    );
    
    this.assertion(
        "if agent is unavailable, assignNextGuestToThisAgent fails",
        function(test) {
            var dummyGuest = {
                    type: 'guest',
                    get: function() { return ''; },
                    respond: function() {
                        this._result = Array.prototype.slice.call(arguments);
                    },
                    notify: function() {
                        this._result = Array.prototype.slice.call(arguments);
                    },
                    hasPerm: function() { return false; }
                },
                dummyAgent = {
                    type: 'agent',
                    available: false,
                    assignGuest: function(guest) { this._guest = guest; },
                    get: function() { return ''; },
                    respond: function() {
                        this._result = Array.prototype.slice.call(arguments);
                    },
                    notify: function() {
                        this._result = Array.prototype.slice.call(arguments);
                    },
                    hasPerm: function() { return true; }
                };
            this.manager.queueGuest(dummyGuest);

            assert.strictEqual(
                this.manager.assignNextGuestToThisAgent(dummyAgent),
                false);
            assert.equal(dummyAgent._result[0].error, 'agent unavailable');
            test.finished();

            this.manager.guests = []; // reset.
        }
    );
    
    this.assertion(
        "agentAvailable adds an agent to the available agents list",
        function(test) {
            var dummyAgent = {
                guests: 0,
                get: function() { return ''; }
            };
            this.manager.events.addListener('message', function(package) {
                assert.ok(package instanceof self.chat.Update);
                assert.equal(package.details, 'available');
                test.finished();
            });
            this.manager.agentAvailable(dummyAgent);
            assert.equal(this.manager.available_agents[0], dummyAgent);
            
            this.manager.events.removeAllListeners('message');
            this.manager.available_agents = []; // reset
        }
    );
    
    this.assertion(
        "agentUnavailable adds an agent to the unavailable agents list",
        function(test) {
            var dummyAgent = {
                guests: 0,
                get: function() { return ''; }
            };
            this.manager.events.addListener('message', function(package) {
                assert.ok(package instanceof self.chat.Update);
                assert.equal(package.details, 'unavailable');
                test.finished();
            });
            this.manager.agentUnavailable(dummyAgent);
            assert.equal(this.manager.unavailable_agents[0], dummyAgent);
            
            this.manager.events.removeAllListeners('message');
            this.manager.unavailable_agents = []; // reset
        }
    );
    
    this.assertion(
        "calling agentAvailable moves unavailable agents to available list",
        function(test) {
            var dummyAgent = {
                guests: 0,
                get: function() { return ''; }
            };
            this.manager.agentUnavailable(dummyAgent);
            assert.equal(this.manager.unavailable_agents[0], dummyAgent);
            
            this.manager.events.addListener('message', function(package) {
                assert.ok(package instanceof self.chat.Update);
                assert.equal(package.details, 'available');
                test.finished();
            });
            this.manager.agentAvailable(dummyAgent);
            assert.equal(this.manager.available_agents[0], dummyAgent);
            assert.equal(this.manager.unavailable_agents.length, 0);
            
            this.manager.events.removeAllListeners('message');
            this.manager.available_agents = []; // reset
        }
    );
    
    this.assertion(
        "calling agentUnavailable moves available agents to unavailable list",
        function(test) {
            var dummyAgent = {
                guests: 0,
                get: function() { return ''; }
            };
            this.manager.agentAvailable(dummyAgent);
            assert.equal(this.manager.available_agents[0], dummyAgent);
            
            this.manager.events.addListener('message', function(package) {
                assert.ok(package instanceof self.chat.Update);
                assert.equal(package.details, 'unavailable');
                test.finished();
            });
            this.manager.agentUnavailable(dummyAgent);
            assert.equal(this.manager.unavailable_agents[0], dummyAgent);
            assert.equal(this.manager.available_agents.length, 0);
            
            this.manager.events.removeAllListeners('message');
            this.manager.unavailable_agents = []; // reset
        }
    );
});