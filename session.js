var utils = require('express/utils'),
    events = require('events'),
    models = require('./models'),
    chat = require('./chat'),
    sys = require('sys');

var SessionBase = Base.extend({
    constructor: function(id) {
        this.id = id;
        this.connections = [];
        this.listeners = [];
        this.message_queue = [];
        this.csrf_token = '';
        
        setInterval(this._expireConns.bind(this), 500);
    },
    
    _expireConns: function() {
        var conn;
        for(var i = 0; i < this.listeners.length; i++) {
            conn = this.listeners[i].connection;
            if((Date.now() - conn._idleStart) >= conn._idleTimeout - 2000) {
                this.listeners[i].respond(200, JSON.encode({type: 'noop'}));
                this.listeners.splice(i, 1);
                i--;
            }
        }
    },

    connection: function(conn) {
        this._req('connections', conn);
    },

    listener: function(conn) {
        this._req('listeners', conn);
    },
    
    _req: function($conn, req) {
        this[$conn].push(req);

        if(this.message_queue.length)
            this._send.apply(this, this.message_queue.shift());
    },

    respond: function(code, message) {
        this._send('connections', code, message);
    },

    notify: function(code, message) {
        this._send('listeners', code, message);
    },

    _queue: function(data) {
        if(!~this.message_queue.indexOf(data))
            this.message_queue.push(data);
    },

    _send: function($conn, code, message) {
        if(!message) {
            message = code;
            code = 200;
        }

        if(typeof message == 'object' ||
           typeof message == 'array')
            message = JSON.encode(message);

        if(this[$conn].length) {
            var $sx = this[$conn],
                next_conn = function() {
                    if(conn = $sx.pop()) {
                        var callback = (conn.param('callback') || '')
                                        .replace(/[^A-Za-z0-9_]/, '');
                        conn.respond(code,
                                    callback ?
                                    sprintf('%s(%s)', callback, message) :
                                    message,
                                    $conn == 'listeners' ? next_conn : false
                        );
                    }
                };
            next_conn();
        } else {
            this._queue(arguments);
        }
    },

    get: function(data) {
        if(data in this.data)
            return this.data[data];
        else if(typeof this[data] !== 'undefined' &&
                typeof this[data] !== 'function')
            return this[data];
        else
            return false;
    }
});

var Agent = SessionBase.extend({
   /**
    * Initialize Agent.
    *
    * Options:
    *
    *  - maxGuests: number of people this agent can help simultaneously
    *
    */
    constructor: function(id, options) {
        SessionBase.call(this, id);
        this.maxGuests = 1;
        Object.merge(this, options);
        this.type = 'agent';
        this.guests = [];

        Session.Djangofied.events.emit('signedOn', this);
    },

    assignGuest: function(guest) {
        // Assign a 'Guest' to this 'Agent'
        this.guests.push(guest);
        guest.agent = this;

        if(!this.available)
            Session.Djangofied.events.emit('unavailable', this);
    },

    unassignGuest: function(guest) {
        // Unassign a 'Guest' from this 'Agent'
        var pos = this.guests.indexOf(guest);
        this.guests.splice(pos, 1);
    },

    get available() {
        // Determine if the 'Agent' can accept a new 'Guest'
        return (this.guests.length < this.maxGuests);
    },

    toString: function() {
        return this.get('username');
    }
});

var Guest = SessionBase.extend({
   /**
    * Initialize Guest.
    *
    * Options:
    *
    *  - question: question the user would like answered
    *  - extensions: Firefox extensions in use
    *  - version: version of Firefox being used
    *  - os: operating system the user is on
    *
    */
    constructor: function(id, options) {
        SessionBase.call(this, id);
        Object.merge(this, options);
        this.agent = null;
        this.type = 'guest';
    },

    toString: function() {
        return this.get('username');
    },

    assignAgent: function(agent) {
        this.agent = agent;
    },

    unassignAgent: function() {
        this.agent = null;
    }
});

Store.MemoryExtended = Store.Memory.extend({
    name: 'MemoryExtended',

    constructor: function() {
        Store.Memory.call(this);
    },

    fetch: function(sid, callback) {
        if(sid && this.store[sid]) {
            callback(null, this.store[sid]);
        } else {
            var self = this;
            this.generate(sid, function(err, session, fresh) {
                if(!err) self.commit(session);
                callback(err, session, fresh);
            });
        }
    },

    generate: function(sid, callback) {
        new models.DjangoSession(
            sid,
            function(user_id) {
                if(!user_id) {
                    callback(null, new Guest(sid, this), true);
                } else if(-~this.perms.indexOf(AGENT_PERM) ||
                          -~this.perms.indexOf(MONITOR_PERM)) {
                    callback(null,
                             new Agent(sid, {
                                maxGuests: AGENT_MAX_GUESTS,
                                data: this
                             }), true);
                } else {
                    callback(null,
                             new Guest(sid, {
                                data: this
                             }), true);
                }
            });
    }
});

Session.Djangofied = Plugin.extend({
    extend: {
        init: function(options) {
            this.cookie = {};
            Object.merge(this, options);
            this.cookie.httpOnly = true;
            this.store = new (this.dataStore || exports.Store.Memory)(options);
            this.startReaper();
            this.events = new events.EventEmitter();
            chat.manager.sessionHandler = this;
        },

        startReaper: function() {
            setInterval(function(self) {
                self.store.reap(self.lifetime || (1).day)
            }, this.reapInterval || this.reapEvery || (1).hour, this)
        }
    },

    on: {
        request: function(event, callback, fresh) {
            var sid = event.request.cookie('sessionid');
            if(-~event.request.url.pathname.indexOf('/public/') ||
                event.request.url.pathname === '/favicon.ico')
                return;
            if(sid) {
                Session.Djangofied.store.fetch(sid, function(err, session, fresh) {
                    if(err) return callback(err);

                    var csrftok = event.request.cookie('_csrf') ||
                                  event.request.param('_csrf');

                    if(!fresh && session.csrf_token != csrftok) {
                        event.request.respond(400, JSON.encode({
                                                        type: 'error',
                                                        error: 'bad request'
                                                    }));
                        return;
                    } else if(fresh) {
                        var csrftok = utils.uid();
                        event.request.cookie('_csrf', csrftok, {
                            expires: Date.now() + (30).days
                        });
                        session.csrf_token = csrftok;
                    }

                    event.request.session = session;
                    event.request.session.touch();

                    if(event.request.url.pathname === '/listen') {
                        event.request.session.listener(event.request);
                        event.request.connection.setTimeout((5).minutes);
                    } else
                        event.request.session.connection(event.request);

                    callback();
                });
            } else {
                event.request.redirect(LOGIN_URL);
            }
            return true;
        },

        response: function(event, callback) {
            if(event.request.session)
                return Session.Djangofied.store.commit(
                           event.request.session,
                           callback),
                       true;
        }
    }
});
