uki(
{ view: 'HSplitPane', rect: '1000 800', anchors: 'left top right bottom',
    handlePosition: 150, leftMin: 150, rightMin: 500, handleWidth: 1,
    leftChildViews: [
        { view: 'Box', rect: '150 30',
          anchors: 'top left right',
          background: 'cssBox(background:#EDF3FE;border-bottom:1px solid #999)',
          childViews: [
              { view: 'Label', rect: '10 0 150 30',
                anchors: 'top left right bottom', html: 'Users' }
          ]
        },
        { view: 'ScrollPane', rect: '0 30 150 800',
          anchors: 'top left right bottom', childViews: [
              { view: 'uki.more.view.TreeList', rect: '150 800',
                anchors: 'top left right bottom', rowHeight: 22,
                style: {fontSize: '12px'}, id: 'users',
                data: [
                    {type: 'available', data: 'Available Agents', children: []},
                    {type: 'unavailable', data: 'Unavailable Agents', children: []},
                    {type: 'guests_q', data: 'Queued Guests', children: []}
                ] }
          ]
        }
    ],
    rightChildViews: [
        { view: 'HSplitPane', rect: '850 800',
          anchors: 'left top right bottom', handleWidth: 1,
          handlePosition: 700, leftMin: 250, rightMin: 150,
          leftChildViews: [
                { view: 'Box', rect: '700 100',
                  anchors: 'top left right', id: 'info',
                  background: 'cssBox(background:#EDF3FE;border-bottom:1px solid #999)',
                  textSelectable: true
                },
                { view: 'Box', rect: '0 100 700 660',
                  anchors: 'top left right bottom', id: 'messages',
                  background: 'cssBox(background:#fff;overflow-y:auto)',
                  textSelectable: true
                },
                { view: 'Box', rect: '0 760 700 40',
                  background: 'cssBox(background:#EDF3FE;border-top:1px solid #999)',
                  anchors: 'left right bottom', childViews: [
                    { view: 'TextField', rect: '10 10 590 20',
                      anchors: 'top left right bottom', name: 'body', id: 'body'
                    },
                    { view: 'Button', rect: '610 10 80 20', text: 'Send',
                      anchors: 'top right', id: 'send'
                    }
                  ]
                }
          ],
          rightChildViews: [
              { view: 'Box', rect: '150 30',
                anchors: 'top left right',
                background: 'cssBox(background:#EDF3FE;border-bottom:1px solid #999)',
                childViews: [
                    { view: 'Label', rect: '10 0 150 30',
                      anchors: 'top left right bottom', html: 'Active Conversations' }
                ]
              },
              { view: 'ScrollableList', rect: '0 30 150 800',
                anchors: 'top left right bottom', id: 'helping'
              }
          ]
        }
   ]
}).attachTo(window, '1000 800', {minSize: '300 0'});


for(var i = 0; i < 50; i++)
    uki('#helping>List').addRow(0, '<strong>text</strong>');

var Agent = function(username) {
    var self = this;

    this.constructor = function() {
        this.username = username;
        this._availability = null;

        this.guests = [];
    };

    this.availability = function(avail) {
        if(!avail) return this._availability;

        var users = uki('#users'),
            user_data = users.data();

        $.each(user_data, function(uidx, value) {
            if(value.type == avail) {
                if(!$.grep(value.children, function(child) {
                   return child.data == self.username;
                }).length) {
                    value.children.push({
                        data: self.username,
                        guest: null
                    });
                }
            } else if(value.type == self._availability &&
                      avail != self._availability) {
                $.each(value.children, function(vidx, user) {
                    if(user.data == self.username) {
                        user_data[uidx].children.splice(vidx, 1);
                        return false;
                    }
                });
            }
        });

        users.data(user_data);
        this._availability = avail;
    };

    this.assign = function(guest) {
        var users = uki('#users'),
            user_data = users.data();

        $.each(user_data, function(uidx, value) {
            if(value.type == self._availability) {
                $.each(value.children, function(vidx, user) {
                    if(user.data == self.username) {
                        user_data[uidx].children[vidx].guest = guest.username;
                        return false;
                    }
                });

                return false;
            }
        });

        users.data(user_data);
        this.guests.push(guest);
    };

    this.unassign = function(guest) {
        if(!~(pos = this.guests.indexOf(guest)))
            return false;

        var users = uki('#users'),
            user_data = users.data();

        this.guests.splice(pos, 1);

        $.each(user_data, function(uidx, value) {
            if(value.type == self._availability) {
                $.each(value.children, function(vidx, user) {
                    if(user.data == self.username) {
                        user_data[uidx].children[vidx].guest = null;
                        return false;
                    }
                });

                return false;
            }
        });

        users.data(user_data);
    }

    this.constructor();
};

var Guest = function(username, queued) {
    var self = this;

    this.constructor = function() {
        this.username = username;
        this._queued = queued;

        var users = uki('#users'),
            user_data = users.data();

        user_data[2].children.push({
            data: username
        });
    };

    this.dequeue = function() {
        var users = uki('#users'),
            user_data = users.data();

        this._queued = false;

        $.each(user_data[2].children, function(vidx, user) {
            if(user.data == self.username) {
                user_data[2].children.splice(vidx, 1);
                return false;
            }
        });
    };

    this.constructor();
};

var AgentChat = function(agent) {
    $.ajaxSetup({cache: false});

    $('#messages').append($('<ul>'));

    this.agent = agent;
    this.actions = {
        'signon': this.initialize,
        'update': this.update,
        'message': this.message,
        'join': this.join,
        'leave': this.leave,
        'end': this.end
    };

    this.agents = {};
    this.guests = {};

    this.rooms = {};

    this.listen();
};

$.extend(AgentChat.prototype, {
    listen: function() {
        var self = this;
        $.getJSON('/listen', function(data) {
            console.log(JSON.stringify(data));

            if(data.type in self.actions)
                self.actions[data.type].call(self, data);

            setTimeout(function() { self.listen(); }, 0);
        });
    },

    initialize: function(data) {
        var users = data.users,
            self = this;

        $.each(users.available_agents, function(i, agent) {
            if(!(agent in self.agents)) {
                self.agents[agent] = new Agent(agent);
                self.agents[agent].availability('available');
            }
        });

        $.each(users.unavailable_agents, function(i, agent) {
            if(!(agent in self.agents)) {
                self.agents[agent] = new Agent(agent);
                self.agents[agent].availability('unavailable');
            }
        });

        $.each(users.guests, function(i, guest) {
            if(!(guest[0] in self.guests)) {
                self.guests[guest[0]] = new Guest(guest[0], !!guest[1]);
                if(!!guest[1]) {
                    self.agents[guest[1]].assign(self.guests[guest[0]]);
                }
            }
        });
    },

    update: function(data) {
        if(data.users.length == 1) {
            var user = data.users[0];

            switch(data.details) {
                case 'available':
                case 'unavailable':
                    if(!(user in this.agents))
                        this.agents[user] = new Agent(user);

                    this.agents[user].availability(data.details);
                break;

                case 'queued':
                    if(!(user in this.guests)) {
                        this.guests[user] =
                            new Guest(user, true);
                    }
                break;

                case 'dequeued':
                    this.guests[user].dequeue();
                break;
            }
        } else if(data.users.length > 1) {
            switch(data.details) {
                case 'assigned':
                    if(!(data.users[0] in this.agents) ||
                       !(data.users[1] in this.guests)) {
                        return false; // error!
                    }

                    this.agents[data.users[0]].assign(data.users[1]);
                break;
            }
        }
    },

    message: function(data) {
        $('#messages>ul').append(
            $('<li>').append(
                $('<span>').html(data.user)
            ).append(
                $('<p>').html(data.message)
            )
        );
    },

    join: function() {
    },

    leave: function() {
    },

    end: function(data) {

    }
});

var chat;
$(function() {
    chat = new AgentChat('');
});
