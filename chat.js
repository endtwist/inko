var utils = require('express/utils');

exports.manager = new (new Class({
    constructor: function() {
        this.rooms = [];
        this.available_agents = [];
        this.unavailable_agents = [];
        this.guests = [];
        
        this.grim_reaper = setInterval(this.reaper, (5).seconds, this);
    },

    putGuestInQueue: function(guest) {
        if(guest.type != 'guest')
            return false;
        
        if(!~this.guests.indexOf(guest) && !guest.agent)
            this.queueGuest(guest);
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

            var room = new exports.Room(agent, guest);
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
        if(-~(pos = this.unavailable_agents.indexOf(agent)))
            this.unavailable_agents.splice(pos, 1);
        this._sortAgents();
    },

    agentUnavailable: function(agent) {
        this.unavailable_agents.push(agent);
        if(-~(pos = this.available_agents.indexOf(agent)))
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
        if(!~user.get('perms').indexOf(MONITOR_PERM)) {
            //user.respond(403, {type: 'error', error: 'no permissions'});
            //return;
        }

        var room = new exports.Room([user], false);
        this.rooms[room.toString()] = room;
    },
    
    destroyRoom: function(user, room) {
        if(room in this.rooms) {
            if(-~this.rooms[room].users.indexOf(user)) {
                this.rooms[room].close();
                delete this.rooms[room];
             } else {
                user.respond({type: 'error', error: 'no permissions'});
             }
        } else {
            user.respond({type: 'error', error: 'no such room'});
        }
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
                var args = Array.prototype.slice.call(arguments, 1);
                if(-~['join', 'leave'].indexOf(action))
                    args[0] = user;
                var room = self.rooms[name];
                room[action].apply(room, args);
            };
        }

        return room_obj;
    },
    
    reaper: function(self) {
        for(room in self.rooms) {
            var $room = self.rooms[room];
            if($room._private &&
               $room.last_activity < (Date.now() - MAX_CHAT_INACTIVITY)) {
               $room.end();
               delete self.rooms[room];
            }
        }
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
             user: this.from.get('username'),
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

exports.Notification = Package.extend({
    constructor: function(user, details) {
        this.room = '';
        this.user = user;
        this.details = details;
    },
    
    toString: function() {
        return JSON.encode(
            {type: 'notification',
             room: this.room,
             user: this.user.get('username'),
             details: this.details}
        );
    }
});

exports.Room = new Class({
    constructor: function(users, guest) {
        this.users = [];
        this.id = utils.uid();
        this.topic = '';
        this.last_activity = Date.now();

        if(!(users instanceof Array))
            users = [users];
        
        if(guest) {
            users.push(guest);
            this.guest = guest;
        }

        var self = this;
        users.each(function(user) {
            self.join(user, true);
            self.users.push(user);
        });
    },

    join: function(user, primary_users) {
        if(!primary_users &&
           this._private &&
           !~user.get('perms').indexOf(MONITOR_PERM)) {
            user.respond(403, {type: 'error', error: 'no permissions'});
            return;
        }

        if(-~this.users.indexOf(user)) {
            user.respond({type: 'error', error: 'already in room'});
            return;
        }

        this.users.push(user);
        var join_msg = {type: 'joined',
                        room: this.toString(),
                        topic: this.topic};
        if(this._private && user.type == 'agent') {
            join_msg.guest = this.guest.data;
            user.respond(join_msg);
        } else if(this._private) {
            user.notify(join_msg);
        }
        // list other users
        
        this.send(new exports.Notification(user, 'joined'));
    },

    leave: function(user) {
        // Add room: key to errors
        if(this.users.splice(this.users.indexOf(user), 1))
            user.respond({type: 'left', room: this.toString()});
        else {
            user.respond({type: 'error', error: 'not in room'});
            return false;
        }
        
        this.send(new exports.Notification(user, 'left'));
    },
    
    end: function() {
        var self = this;
        if(this.guest)
            this.guest.unassignAgent();
            
        this.users.each(function(user) {
            if(user.type != 'guest')
                user.unassignGuest(self.guest);
            user.notify({type: 'end', room: self.toString()});
        });
    },

    send: function(message) {
        if(!~this.users.indexOf(message.user)) {
            message.user.respond(403, {
                type: 'error',
                error: 'no permissions'
            });
            return;
        }

        if('body' in message && !message.body.length) {
            message.user.respond({
                type: 'error',
                error: 'no message body'
            });
            return;
        }

        message.room = this.id;
        var recips = this.users.slice();
        while(to = recips.shift())
            to.notify(message.toString());
        
        this.touch();
    },

    toString: function() {
        return this.id;
    },
    
    touch: function() {
        this.last_activity = Date.now();
    },
    
    get _private() {
        return !!this.guest;
    }
});
