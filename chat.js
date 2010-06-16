var utils = require('express/utils');

exports.manager = new (new Class({
    constructor: function() {
        this.rooms = [];
        this.available_agents = [];
        this.unavailable_agents = [];
        this.guests = [];
    },

    assignNextGuestToThisAgent: function(agent, requested_by) {
        if(agent.type != 'agent') {
            (requested_by || agent).respond({
                type: 'error',
                error: 'not an agent'
            });
            return false;
        }

        if(agent.available && this.guests.length) {
            var guest = this.guests.shift();
            agent.assignGuest(guest);

            // assign guest metadata to private rooms!
            var room = new exports.Room([agent, guest], true);
            this.rooms[room.toString()] = room;
        } else {
            (requested_by || agent).respond({
                type: 'error',
                error: (!agent.available ?
                            'agent unavailable' :
                            'no queued guests')
            });
            return false;
        }
    },

    assignNextGuestToNextAgent: function(requested_by) {
        if(this.available_agents.length) {
            this.assignNextGuestToThisAgent(available_agents.first,
                                            requested_by);
        } else {
            requested_by.respond({
                type: 'error',
                error: 'no agents available'
            });
        }
    },

    agentAvailable: function(agent) {
        this.available_agents.push(agent);
        if((pos = this.unavailable_agents.indexOf(agent)) > -1)
            this.unavailable_agents.splice(pos, 1);
        this._sortAgents();
    },

    agentUnavailable: function(agent) {
        this.unavailable_agents.push(agent);
        if((pos = this.available_agents.indexOf(agent)) > -1)
            this.available_agents.splice(pos, 1);
        this._sortAgents();
    },

    _sortAgents: function() {
        this.available_agents.sort(function(a, b) {
            if(a.guests.length > b.guests.length)
                return true;
            else
                return false;
        });
    },

    queueGuest: function(guest) {
        this.guests.push(guest);
    },

    dequeueGuest: function(guest, callback) {
        callback(this.guests.shift());
    },

    get queue() {
        var guests = [];
        for(var i = 0, g = this.guests.length; i < g; i++)
            guests.push(this.guests[i].toString());
        return JSON.stringify(guests);
    },

    initRoom: function(user, room) {
        if(user.get('perms').indexOf(MONITOR_PERM) == -1) {
            //user.respond(403, {type: 'error', error: 'no permissions'});
            //return;
        }

        var room = new exports.Room([user], false);
        this.rooms[room.toString()] = room;
    },

    // lcm.with_('user', 'room or id')('action', 'arg', 'arg')
    with_: function(user, name) {
        var room_obj = function() {
            user.respond({type: 'error', error: 'no such room'});
            return false;
        };

        if(name in this.rooms) {
            var self = this;
            room_obj = function() {
                var action = arguments[0];
                if(['join', 'leave'].indexOf(action) > -1)
                    arguments[1] = user;
                var args = Array.prototype.slice.call(arguments, 1);
                var room = self.rooms[name];
                room[action].apply(room, args);
            };
        }

        return room_obj;
    }
}));

var Package = new Class({
    _sanitize: function(content) {
        content = content.replace(/<(.|\n)*?>/g, '');
        return content;
    }
});

exports.Message = Package.extend({
    constructor: function(from, body) {
        this.room = '';
        this.from = from;
        this.body = body;
        this.sent = Date.now();
    },

    toString: function() {
        return JSON.encode(
            {type: 'message',
             room: this.room,
             from: this.from.get('username'),
             body: this._sanitize(this.body),
             sent: this.sent}
        );
    }
});

exports.Status = Package.extend({
    constructor: function(user, type, status) {
        this.room = '';
        this.user = user;
        this.type = type;
        this.status = status;
    },

    toString: function() {
        return JSON.encode(
            {type: 'status',
             room: this.room,
             user: this.user.get('username'),
             of: this.type,
             is: this.status}
        );
    }
});

exports.Room = new Class({
    constructor: function(users, prv) {
        this.users = [];
        this.prv = !!prv;
        this.id = utils.uid();
        this.topic = '';

        var self = this;
        users.each(function(user) {
            self.join(user, true);
            self.users.push(user);
        })
    },

    join: function(user, primary_users) {
        if(!primary_users &&
           this.prv &&
           user.get('perms').indexOf(MONITOR_PERM) == -1) {
            user.respond(403, {type: 'error', error: 'no permissions'});
            return;
        }

        if(this.users.indexOf(user) != -1) {
            user.respond({type: 'error', error: 'already in room'});
            return;
        }

        this.users.push(user);
        user.respond({type: 'joined',
                      room: this.toString(),
                      topic: this.topic});
                      // list other users
    },

    leave: function(user) {
        // Add room: key to errors
        user = this.users.splice(this.users.indexOf(user), 1);
        if(user)
            user.respond({type: 'left', room: this.toString()});
        else {
            user.respond({type: 'error', error: 'not in room'});
            return false;
        }
    },

    send: function(message) {
        if(this.users.indexOf(message.from) == -1) {
            message.from.respond(403, {
                type: 'error',
                error: 'no permissions'
            });
            return;
        }

        if(!message.body.length) {
            message.from.respond({
                type: 'error',
                error: 'no message body'
            });
            return;
        }

        message.room = this.id;
        var recips = this.users.slice();
        while(to = recips.shift())
            /*if(to != message.from)*/ to.respond(message.toString());
    },

    toString: function() {
        return this.id;
    }
});
