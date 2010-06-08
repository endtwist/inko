var sys = require('sys'),
    utils = require('express/utils'),
    models = require('./models');

var SessionBase = Base.extend({
    type: 'unset',
    
    become: function(type, options) {
        return false;
    }
});

var User = SessionBase.extend({
    constructor: function(sid, store) {
        Base.call(this, sid);
        this.store = store;
        this.type = 'unset';
    },
    
    become: function(type, options, callback) {
        var session = (type == 'agent' ?
                       new Agent(this.id, options, callback) :
                       new Guest(this.id, options, callback));
        this.store[type + 's'].push(session);
        
        this.store.store[this.id] = session;
        return session;
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
    constructor: function(id, options, callback) {
        Object.merge(this, options);
        this.id = id;
        this.data = new models.DjangoSession(
                            this.id,
                            function(user_id) {
                                this.authenticated = !!user_id;
                                if(callback)
                                    callback(this.authenticated);
                            });
        this.type = 'agent';
    },

    assignGuest: function(guest) {
        // Assign a 'Guest' to this 'Agent'
    },

    available: function() {
        // Determine if the 'Agent' can accept a new 'Guest'
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
        Object.merge(this, options);
        this.id = id;
        this.username = username;
        this.agent = null;
        this.type = 'guest';
    }
});

Store.MemoryExtended = Store.Memory.extend({
    name: 'MemoryExtended',

    constructor: function() {
        Store.Memory.call(this);
        this.agents = [];
        this.guests = [];
    },
    
    fetchAvailableAgent: function(callback) {
        for(agent in this.agents) {
            if(agent.available()) {
                callback(agent);
                break;
            }
        }
    },
    
    queueGuest: function(guest) {
        this.guests.push(guest);
    },
    
    dequeueGuest: function(guest, callback) {
        callback(this.guests.shift());
    },
    
    fetch: function(sid, callback) {
        if(sid && this.store[sid])
            callback(null, this.store[sid]);
        else
            this.generate(sid, callback);
    },
    
    generate: function(sid, callback) {
        callback(null, new User(sid, this));
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
        request: function(event, callback) {
            var sid = event.request.cookie('sessionid');
            if(!sid && event.request.url.pathname === '/favicon.ico')
                return;
            if(sid) {
                Session.Djangofied.store.fetch(sid, function(err, session) {
                    if(err) return callback(err);
                    event.request.session = session;
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
