var utils = require('express/utils'),
    models = require('./models'),
    chat = require('./chat');
var sys = require('sys');

var SessionBase = Base.extend({
    constructor: function(id) {
        this.id = id;
        this.connections = [];
        this.csrf_token = '';
    },

    connection: function(conn) {
        this.connections.push(conn);
    },

    respond: function(code, message) {
        if(message == null) {
            message = code;
            code = 200;
        }

        if(typeof message == 'object' ||
           typeof message == 'array')
            message = JSON.encode(message);

        while(conn = this.connections.shift()) {
            var callback = (conn.param('callback') || '')
                            .replace(/[^A-Za-z0-9_]/, '');
            conn.respond(200,
                        callback ?
                        sprintf('%s(%s)', callback, message) :
                        message
            );
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

        chat.manager.agentAvailable(this);
    },

    assignGuest: function(guest) {
        // Assign a 'Guest' to this 'Agent'
        this.guests.push(guest);
        guest.agent = this;

        if(!this.available)
            chat.manager.agentUnavailable(this);
    },

    get available() {
        // Determine if the 'Agent' can accept a new 'Guest'
        return (this.guests < this.maxGuests);
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

        chat.manager.queueGuest(this);
    },

    toString: function() {
        return this.get('username');
    }
});

Store.MemoryExtended = Store.Memory.extend({
    name: 'MemoryExtended',

    constructor: function() {
        Store.Memory.call(this);
    },

    fetch: function(sid, callback) {
        if(sid && this.store[sid])
            callback(null, this.store[sid]);
        else
            this.generate(sid, callback);
    },

    generate: function(sid, callback) {
        new models.DjangoSession(
            sid,
            function(user_id) {
                if(!user_id) {
                    callback(null, new Guest(sid, this), true);
                } else if(this.perms.indexOf(AGENT_PERM) != -1 ||
                          this.perms.indexOf(MONITOR_PERM) != -1) {
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
            this.cookie = {}
            Object.merge(this, options)
            this.cookie.httpOnly = true
            this.store = new (this.dataStore || exports.Store.Memory)(options)
            this.startReaper()
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
            if(!sid && event.request.url.pathname === '/favicon.ico')
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
                    event.request.session.connection(event.request);
                    event.request.session.touch();
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
