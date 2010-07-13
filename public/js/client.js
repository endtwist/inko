var inko = {view: {}};

inko.view.list = uki.view.declare('inko.view.List', uki.view.List, function(Base) {
    this._setup = function() {
        Base._setup.call(this);
        uki.extend(this, {
            _render: new inko.view.list.Render()
        });
    };
});

inko.view.list.Render = uki.newClass(uki.view.list.Render, {
    render: function(data, rect, i) {
        console.log(data);
        data = data['text'] ? data['text'] : data;
        return '<div style="line-height: ' + rect.height + 'px; font-size: 12px; padding: 0 4px;">' +
               data +
               ' (<a href="#" class="close">close</a>)' +
               '</div>';
    }
});

function chatView() {
    return { view: 'Box', rect: '700 750', anchors: 'top left right bottom',
             childViews: [
               { view: 'Box', rect: '700 100',
                 anchors: 'top left right', className: 'info',
                 background: 'cssBox(background:#EDF3FE;border-bottom:1px solid #999)',
                 textSelectable: true
               },
               { view: 'Box', rect: '0 100 700 650',
                 anchors: 'top left right bottom', className: 'messages',
                  background: 'cssBox(background:#fff;)',
                  textSelectable: true
               }
             ]
           };
}

/* Agent object
 *
 * Used by the Agent view.
 */
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

/* Guest object
 *
 * Used by the Agent view.
 */
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

        users.data(user_data);
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

/* Room object
 *
 * Used by the Agent view.
 */
var Room = function(name, topic, guest) {
    var self = this;

    this.constructor = function() {
        this.name = name;
        this.topic = topic;
        this.users = [];
        this._private = false;

        if(guest && guest['username']) {
            this._private = true;
            this.guest = guest;

            var list = uki('#helping>List');
            list.data($.merge(list.data(), [{
                room: this.name,
                text: guest.username
            }]));

            var roomView = chatView();
            roomView.id = 'room-' + this.name;
            this.roomView = uki(roomView)
                            .attachTo($('#chatArea')[0], '700 750');

            var messageListContainer = $(this.roomView.childViews()[1].dom())
                                       .find('div').css('overflow-y', 'scroll');
            this.messageList = $('<ol class="message-list">')
                               .appendTo(messageListContainer);
        }
    };

    this.show = function() {
        uki('#chatArea>Box').visible(false);
        this.roomView.visible(true);
    };

    this.destroy = function() {
        uki('#chatArea').removeChild(this.roomView);
    };

    this.join = function(username) {
        this.users.push(username);
        console.log(username + ' joined room ' + this.name);
        // notify...
    };

    this.leave = function(username) {
        if(pos = $.inArray(this.users, username)) {
            this.users.splice(pos, 1);
        }
        console.log(username + ' left room ' + this.name);
        // notify...
    };

    this.send = function(message) {
        $.post('/message', {id: this.name, body: message});
    };

    this.addMessage = function(username, message, you) {
        var msg;
        if(arguments.length == 1)
            msg = $('<li class="message-server">').html(username);
        else
            msg = $('<li class="' +
                    (you ? 'message-you' : 'message-them') +
                    '">').html('<span>' + username + ':</span> ' + message);

        this.messageList.append(msg);
    };

    this.constructor();
};

/* Agent Chat View
 *
 * Allow Agents to manage and chat with guests and other agents.
 */
var AgentChat = function(agent) {
    $.ajaxSetup({cache: false});
    var self = this;
    
    uki(
    { view: 'HSplitPane', rect: '1000 800', anchors: 'left top right bottom',
        handlePosition: 150, leftMin: 150, rightMin: 500, handleWidth: 1,
        background: '#EDF3FE',
        leftChildViews: [
            { view: 'Box', rect: '150 30', anchors: 'top left right',
              background: 'theme(panel)',
              childViews: [
                  { view: 'Label', rect: '10 0 150 30',
                    anchors: 'top left right bottom', html: 'Users' }
              ]
            },
            { view: 'ScrollPane', rect: '0 30 150 720',
              anchors: 'top left right bottom',
              background: 'cssBox(border-bottom:1px solid #999;)',
              childViews: [
                  { view: 'uki.more.view.TreeList', rect: '150 720',
                    anchors: 'top left right bottom', rowHeight: 22,
                    style: {fontSize: '12px'}, id: 'users',
                    data: [
                        {type: 'available', data: 'Available Agents', children: []},
                        {type: 'unavailable', data: 'Unavailable Agents', children: []},
                        {type: 'guests_q', data: 'Queued Guests', children: []}
                    ] }
              ]
            },
            { view: 'Box', rect: '0 750 150 50', anchors: 'bottom left right',
              background: 'theme(panel)',
              childViews: [
                    { view: 'Button', rect: '10 10 130 30',
                      anchors: 'top left right bottom',
                      text: 'Assist Guest', id: 'assist-guest'
                    }
              ]
            },
        ],
        rightChildViews: [
            { view: 'HSplitPane', rect: '850 800',
              anchors: 'left top right bottom', handleWidth: 1,
              handlePosition: 700, leftMin: 250, rightMin: 150,
              leftChildViews: [
                    { view: 'Box', rect: '700 750', anchors: 'top left right bottom',
                      id: 'chatArea'
                    },
                    { view: 'Box', rect: '0 750 700 50',
                      background: 'theme(panel)',
                      anchors: 'left right bottom', childViews: [
                        { view: 'TextField', rect: '10 10 590 30',
                          style: {fontSize: '14px'},
                          anchors: 'top left right bottom', name: 'body', id: 'body'
                        },
                        { view: 'Button', rect: '610 10 80 30', text: 'Send',
                          anchors: 'top right', id: 'send'
                        }
                      ]
                    }
              ],
              rightChildViews: [
                  { view: 'Box', rect: '150 30',
                    anchors: 'top left right',
                    background: 'theme(panel)',
                    childViews: [
                        { view: 'Label', rect: '10 0 150 30',
                          anchors: 'top left right bottom', html: 'Active Conversations' }
                    ]
                  },
                  { view: 'ScrollPane', rect: '0 30 150 770',
                    anchors: 'top left right bottom', id: 'helping',
                    childViews: [
                        { view: 'inko.view.List', rect: '150 770',
                          anchors: 'top left right bottom', data: [] }
                    ]
                  }
              ]
            }
       ]
    }).attachTo(window, '1000 800', {minSize: '300 0'});

    $('#assist-guest').click(function() { self.assist(); });

    uki('#helping>List').bind('keydown mousedown', function(e) {
        var listdata = this.data();
        if(!listdata[this.selectedIndex()] && self.activeRoom) {
            var list = this;
            $.each(listdata, function(i, el) {
                if(el.room == self.activeRoom) {
                    list.selectedIndex(i);
                    return false;
                }
            });
        } else if(listdata[this.selectedIndex()]) {
            var item = listdata[this.selectedIndex()];
            self.rooms[item.room].show();
            self.activeRoom = item.room;
        }
    });

    $(uki('#helping>List').dom()).find('.close').live('click', function(e) {
        var list = uki('#helping>List'),
            listdata = list.data(),
            index = list.selectedIndex(),
            room = listdata[list.selectedIndex()].room;

        $.getJSON('/end/' + room);

        list.removeRow(index);
        if(listdata[index+1]) {
            list.selectedIndex(index);
            self.activeRoom = listdata[index].room;
        } else if(listdata[index-1]) {
            list.selectIndex(index-1);
            self.activeRoom = listdata[index].room;
        } else {
            self.activeRoom = null;
        }

        self.rooms[room].destroy();
        delete self.rooms[room];

        if(!self.activeRoom)
            self.messageControlsDisabled(true);

        return false;
    });

    var sendAction = function(e) {
        if(!self.activeRoom)
            return self.messageControlsDisabled(true);

        self.rooms[self.activeRoom].send(uki('#body').value());
        uki('#body').value('');
    };
    uki('#send').bind('click', sendAction);
    uki('#body').bind('keyup', function(e) {
        (e.domEvent.which == 13 && sendAction.call(this));
    });

    this.agent = agent;
    this.actions = {
        'signon': this.initialize,
        'update': this.update,
        'message': this.message,
        'notification': this.notification,
        'join': this.join,
        'leave': this.leave,
        'end': this.end
    };

    this.agents = {};
    this.guests = {};

    this.rooms = {};
    this.activeRoom = null;

    this.messageControlsDisabled(true);
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

    assist: function() {
        // Should check if Agent is available
        // and if there are any queued guests...

        var self = this;
        $.getJSON('/assist', function(data) {
            if(data.type == 'joined') {
                self.rooms[data.room] =
                    new Room(data.room, data.topic, data.guest);
                self.messageControlsDisabled(false);

                if(!self.activeRoom) {
                    self.activeRoom = data.room;
                    var list = uki('#helping>List');
                    $.each(list.data(), function(i, el) {
                        if(el.room == data.room) {
                            list.selectedIndex(i);
                            return false;
                        }
                    });
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
        if(data.room in this.rooms)
            this.rooms[data.room].addMessage(data.user,
                                             data.body,
                                             data.user == USERNAME);
    },

    notification: function(data) {
        switch(data.details) {
            case 'joined': this.join(data); break;
            case 'left': this.leave(data); break;
        }
    },

    join: function(data) {
        if(data.room in this.rooms)
            this.rooms[data.room].join(data.user);
    },

    leave: function(data) {
        if(data.room in this.rooms)
            this.rooms[data.room].leave(data.user);
    },

    end: function(data) {
        if(data.room in this.rooms)
            this.rooms[data.room].addMessage('This room has been terminated.');
    },

    messageControlsDisabled: function(state) {
        uki('#send').disabled(state);
        uki('#body').disabled(state);
        $(uki('#body')[0].dom()).find('input')
                                .attr('disabled', state ? 'disabled' : '');
    }
});

/* Guest Chat View
 *
 * Guests are queued and can chat with a single agent.
 */
var GuestChat = function(guest) {
    $.ajaxSetup({cache: false});
    var self = this;
    
    uki(
    { view: 'Box', rect: '1000 800', anchors: 'left top right bottom',
      background: '#EDF3FE', childViews: [
        { view: 'Box', rect: '1000 750', id: 'messages',
          anchors: 'top left right bottom',
          background: 'cssBox(background:#fff;)',
          textSelectable: true
        },
        { view: 'Box', rect: '0 750 1000 50',
          background: 'theme(panel)',
          anchors: 'left right bottom', childViews: [
            { view: 'TextField', rect: '10 10 890 30',
              style: {fontSize: '14px'},
              anchors: 'top left right bottom', name: 'body', id: 'body'
            },
            { view: 'Button', rect: '910 10 80 30', text: 'Send',
              anchors: 'top right', id: 'send'
            }
          ]
        }
      ]
    }).attachTo(window, '1000 800', {minSize: '300 0'});
    
    var messageListContainer = $(uki('#messages').dom())
                               .find('div').css('overflow-y', 'scroll');
    this.messageList = $('<ol class="message-list">')
                       .appendTo(messageListContainer);
    
    this.room = null;
    this.actions = {
        'message': this.message,
        'notification': this.notification,
        'joined': this.join,
        'left': this.leave,
        'end': this.end
    };
    
    var sendAction = function(e) {
        if(!self.room)
            return self.messageControlsDisabled(true);

        self.send(uki('#body').value());
        uki('#body').value('');
    };
    uki('#send').bind('click', sendAction);
    uki('#body').bind('keyup', function(e) {
        (e.domEvent.which == 13 && sendAction.call(this));
    });
    
    this.messageControlsDisabled(true);
    this.listen();
    this.addMessage('Please wait for the next available agent.');
};

$.extend(GuestChat.prototype, {
    listen: function() {
        var self = this;
        $.getJSON('/listen', function(data) {
            console.log(JSON.stringify(data));

            if(data.type in self.actions)
                self.actions[data.type].call(self, data);

            setTimeout(function() { self.listen(); }, 0);
        });
    },
    
    messageControlsDisabled: function(state) {
        uki('#send').disabled(state);
        uki('#body').disabled(state);
        $(uki('#body')[0].dom()).find('input')
                                .attr('disabled', state ? 'disabled' : '');
    },

    addMessage: function(username, message, you) {
        var msg;
        if(arguments.length == 1)
            msg = $('<li class="message-server">').html(username);
        else
            msg = $('<li class="' +
                    (you ? 'message-you' : 'message-them') +
                    '">').html('<span>' + username + ':</span> ' + message);

        this.messageList.append(msg);
    },
    
    send: function(message) {
        if(!this.room) return;
        $.post('/message', {id: this.room, body: message});
    },
    
    message: function(data) {
        this.addMessage(data.user, data.body, data.user == USERNAME);
    },

    notification: function(data) {

    },
    
    join: function(data) {
        this.room = data.room;
        this.addMessage('You are now being assisted by ' + (data.agent || '?'));
        this.messageControlsDisabled(false);
    },
    
    leave: function() {

    },
    
    end: function() {
        this.room = null;
        this.addMessage('This chat has been terminated.');
        this.messageControlsDisabled(true);
    }
});

var chat;
