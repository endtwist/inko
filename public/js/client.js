var inko = {view: {}};

inko.view.treeList = uki.view.declare('inko.view.TreeList', uki.more.view.TreeList, function(Base) {
    this._setup = function() {
        Base._setup.call(this);
        uki.extend(this, {
            _render: new inko.view.treeList.Render()
        });
    };
});

inko.view.treeList.Render = uki.newClass(uki.view.list.Render, new function() {
    this._parentTemplate = new uki.theme.Template(
        '<div class="${classPrefix}-row ${classPrefix}-${opened}" style="margin-left:${indent}px">' +
            '<div class="${classPrefix}-toggle"><i class="toggle-tree"></i></div>' +
            '<span class="${classPrefix}-status ${classPrefix}-status-${status}">&bull;</span> ${text}' +
        '</div>'
    );

    this._leafTemplate = new uki.theme.Template(
        '<div class="${classPrefix}-row" style="margin-left:${indent}px">' +
            '<span class="${classPrefix}-status ${classPrefix}-status-${status}">&bull;</span> ${text}' +
        '</div>'
    );

    this.initStyles = function() {
        this.classPrefix = 'treeList-' + uki.guid++;
        var style = new uki.theme.Template(
            '.${classPrefix}-row { color: #333; position:relative; padding-top:3px; cursor: default; } ' +
            '.${classPrefix}-toggle { overflow: hidden; position:absolute; left:-15px; top:5px; width: 10px; height:9px; } ' +
            '.${classPrefix}-toggle i { display: block; position:absolute; left: 0; top: 0; width:20px; height:18px; background: url(${imageSrc});} ' +
            '.${classPrefix}-selected { background: #3875D7; } ' +
            '.${classPrefix}-selected .${classPrefix}-row { color: #FFF; } ' +
            '.${classPrefix}-selected i { left: -10px; } ' +
            '.${classPrefix}-selected-blured { background: #CCCCCC; } ' +
            '.${classPrefix}-opened i { top: -9px; }' +
            '.${classPrefix}-status { display: inline-block; font-size: 32px; line-height: 16px; float: left; margin-right: 5px; }' +
            '.${classPrefix}-status-available { color: #00cc00; }' +
            '.${classPrefix}-status-unavailable { color: #777; }' +
            '.${classPrefix}-status-away { color: #df9b00; }' +
            '.${classPrefix}-status-none { display: none; }'
        ).render({
            classPrefix: this.classPrefix,
            imageSrc: 'public/i/arrows.png' // should call uki.image here
        });
        uki.dom.createStylesheet(style);
    };

    this.render = function(row, rect, i) {
        this.classPrefix || this.initStyles();
        var text = row.data,
            status = row['status'] || 'none',
            children = uki.attr(row, 'children');
        if (children && children.length) {
            return this._parentTemplate.render({
                text: text,
                status: status,
                indent: row.__indent*18 + 22,
                classPrefix: this.classPrefix,
                opened: row.__opened ? 'opened' : ''
            });
        } else {
            return this._leafTemplate.render({
                text: text,
                status: status,
                indent: row.__indent*18 + 22,
                classPrefix: this.classPrefix
            });
        }
    };

    this.setSelected = function(container, data, state, focus) {
        container.className = !state ? '' : focus ? this.classPrefix + '-selected' : this.classPrefix + '-selected-blured';
    };
});

function chatView() {
    return { view: 'Box', rect: '700 750', anchors: 'top left right bottom',
             className: 'chatView',
             childViews: [
               { view: 'Box', rect: '700 100',
                 anchors: 'top left right', className: 'info',
                 background: 'cssBox(background:#EDF3FE;border-bottom:1px solid #999)',
                 textSelectable: true,
                 childViews: [
                    { view: 'Label', rect: '20 20 200 15',
                      anchors: 'top left', className: 'chatUsername',
                      text: 'Username'
                    },
                    { view: 'Label', rect: '20 50 200 15',
                      anchors: 'top left', className: 'chatQuestion',
                      text: 'This is where the question goes?'
                    },
                    { view: 'Label', rect: '20 70 200 15',
                      anchors: 'top left', className: 'chatOtherInfo',
                      text: 'Other information...'
                    },
                    { view: 'Button', rect: '630 10 50 30',
                      anchors: 'top right', className: 'closeChat',
                      text: 'Close'
                    }
                 ]
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

        var users = uki('#users'),
            user_data = users.data();

        user_data[0].children.push({
            data: username,
            status: 'available',
            children: []
        });
        users.data(user_data);
    };

    this.availability = function(avail) {
        if(!avail) return this._availability;

        var users = uki('#users'),
            user_data = users.data();

        $.each(user_data[0].children, function(i, user) {
            if(user.data == self.username) {
                user.status = avail;
                return false;
            }
        });

        users.data(user_data);
        this._availability = avail;
    };

    this.assign = function(guest) {
        var users = uki('#users'),
            user_data = users.data();

        $.each(user_data[0].children, function(i, user) {
            if(user.data == self.username) {
                user.children.push({
                    data: guest.username
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

        $.each(user_data[0].children, function(i, user) {
            if(user.data == self.username) {
                $.each(user.children, function(pos, g) {
                    if(g.data == guest.username) {
                        user.children.splice(pos, 1);
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

        user_data[1].children.push({
            data: username
        });

        users.data(user_data);
    };

    this.dequeue = function() {
        var users = uki('#users'),
            user_data = users.data();

        this._queued = false;

        $.each(user_data[1].children, function(vidx, user) {
            if(user.data == self.username) {
                user_data[1].children.splice(vidx, 1);
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
        this.active = true;

        var room_view = chatView();
        room_view.id = 'room-' + this.name;
        this.room_view = uki(room_view)
                        .attachTo($('#chatArea')[0], '700 750');

        var message_list_container = $(this.room_view.childViews()[1].dom())
                                   .find('div').css('overflow-y', 'scroll');
        this.message_list = $('<ol class="message-list">')
                           .appendTo(message_list_container);

        if(guest && guest['username']) {
            this._private = true;
            this.guest = guest;

            var list = uki('#users'),
                list_data = list.data();
            list_data[2].children.push({
                room: this.name,
                username: guest.username,
                data: guest.username
            });
            list.data(list_data);

            $(this.room_view[0]._dom).find('.chatUsername').html(guest.username)
                                     .find('.chatQuestion').html(guest.question)
                                     .find('.chatOtherInfo')
                                     .html('Firefox ' + guest.version + ' / ' +
                                           guest.os + ' / ' + guest.extensions);
        }
    };

    this.show = function() {
        $('.chatView').hide();
        $(this.room_view[0]._dom).show();
    };

    this.destroy = function() {
        uki('#chatArea').removeChild(this.room_view);

        var self = this,
            list = uki('#users'),
            list_data = list.data();
        $.each(list_data[2].children, function(index, value) {
            if(value.room == self.name) {
                list_data[2].children.splice(index, 1);
                return false;
            }
        });
        list.data(list_data);

        this.active = false;
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

        this.message_list.append(msg);
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

    uki({
        view: 'HSplitPane', rect: '1000 800', anchors: 'left top right bottom',
        handlePosition: 175, leftMin: 150, rightMin: 500, handleWidth: 1,
        background: '#EDF3FE',
        leftChildViews: [
            { view: 'ScrollPane', rect: '175 670',
              anchors: 'top left right bottom',
              background: 'cssBox(border-bottom:1px solid #999;)',
              childViews: [
                  { view: 'inko.view.TreeList', rect: '175 670',
                    anchors: 'top left right bottom', rowHeight: 22,
                    style: {fontSize: '12px'}, id: 'users',
                    data: [
                        {type: 'available', data: 'Agents', children: []},
                        {type: 'guests_q', data: 'Guest Queue', children: []},
                        {type: 'your_convos', data: 'Your Conversations', children: []},
                        {type: 'direct_msgs', data: 'Direct Messages', children: []}
                    ] }
              ]
            },
            { view: 'Box', rect: '0 670 175 130', anchors: 'bottom left right',
              background: 'theme(panel)',
              childViews: [
                    { view: 'uki.more.view.ToggleButton', rect: '10 10 155 30',
                      anchors: 'top left right bottom',
                      text: 'Away', id: 'away-toggle'
                    },
                    { view: 'Button', rect: '10 50 155 30',
                      anchors: 'top left right bottom',
                      text: 'Assist Guest', id: 'assist-guest'
                    },
                    { view: 'Button', rect: '10 90 155 30',
                      anchors: 'top left right bottom',
                      text: 'Transfer Guest', id: 'transfer-guest'
                    }
              ]
            },
        ],
        rightChildViews: [
            { view: 'Box', rect: '825 750', anchors: 'top left right bottom',
              id: 'chatArea'
            },
            { view: 'Box', rect: '0 750 825 50',
              background: 'theme(panel)',
              anchors: 'left right bottom', childViews: [
                { view: 'TextField', rect: '10 10 715 30',
                  style: {fontSize: '14px'},
                  anchors: 'top left right bottom', name: 'body', id: 'body'
                },
                { view: 'Button', rect: '735 10 80 30', text: 'Send',
                  anchors: 'top right', id: 'send'
                }
              ]
            }
       ]
    }).attachTo(window, '1000 800', {minSize: '300 0'});

    uki({
        view: 'Box', rect: '1000 800', anchors: 'top left right bottom',
        background: 'cssBox(background:#000;opacity:0.8;)', id: 'overlay'
    }).attachTo(window, '1000 800');

    uki({
        view: 'Box', rect: '375 320 250 160', anchors: '',
        id: 'transfer-win', background: 'cssBox(background:#fff;)',
        childViews: [
            { view: 'Label', rect: '30 30 340 20', anchors: 'top left',
              html: 'Transfer this conversation to&hellip;'
            },
            { view: 'TextField', rect: '30 60 190 30',
              anchors: 'top left right', id: 'transfer-to'
            },
            { view: 'Button', rect: '50 100 80 30',
              anchors: 'top right', text: 'Cancel', id: 'cancel-transfer'
            },
            { view: 'Button', rect: '140 100 80 30',
              anchors: 'top right', text: 'Transfer', id: 'transfer'
            }
        ]
    }).attachTo(uki('#overlay').dom(), '1000 800');

    $('#overlay, #transfer-win').hide();
    uki('#transfer-guest').bind('click', function() {
        $('#overlay, #transfer-win').show();
        uki('#transfer-to').focus();
    });
    uki('#cancel-transfer').bind('click', function() {
        $('#overlay, #transfer-win').hide();
    });
    uki('#transfer').bind('click', function() { self.transfer(); });
    uki('#transfer-to').bind('keydown', function(event) {
        if(event.keyCode == '13') self.transfer();
    });
    uki('#assist-guest').bind('click', function() { self.assist(); });
    uki('#away-toggle').bind('click', function() {
        if(this.checked())
            self.status('away');
        else
            self.status('available');
    });

    uki('#users').bind('keyup mousedown', function(e) {
        var selection = this.selectedRows()[0];
        if(selection) {
            if('room' in selection && self.rooms[selection.room]) {
                self.rooms[selection.room].show();
                if(self.rooms[selection.room].active)
                    self.messageControlsDisabled(false);
                else
                    self.messageControlsDisabled(true);
                self.active_room = selection.room;
            } else if('username' in selection && self.dms[selection.username]) {
                self.dms[selection.username].show();
                self.messageControlsDisabled(false);
            }
        }
    });

    var sendAction = function(e) {
        if(!self.active_room)
            return self.messageControlsDisabled(true);

        self.rooms[self.active_room].send(uki('#body').value());
        uki('#body').value('');
    };
    uki('#send').bind('click', sendAction);
    uki('#body').bind('keyup', function(e) {
        (e.domEvent.which == 13 && sendAction.call(this));
    });

    this.agent = agent;
    this.actions = {
        'update': this.update,
        'message': this.message,
        'notification': this.notification,
        'join': this.join,
        'leave': this.leave,
        'end': this.end,
        'transfer': this.receiveTransfer,
        'status': this.statusUpdate
    };

    this.agents = {};
    this.guests = {};

    this.rooms = {};
    this.dms = {};
    this.active_room = null;

    this.messageControlsDisabled(true);

    this.list();
    this.listen();
};

$.extend(AgentChat.prototype, {
    listen: function() {
        var self = this;
        $.getJSON('/listen', function(data) {
            if(data.type in self.actions)
                self.actions[data.type].call(self, data);

            setTimeout(function() { self.listen(); }, 0);
        });
    },

    list: function() {
        var self = this;
        $.getJSON('/list', function(users) {
            $.each(users.agents, function(i, agent) {
                if(!(agent[0] in self.agents)) {
                    self.agents[agent[0]] = new Agent(agent[0]);
                    self.agents[agent[0]].availability(agent[1]);
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

            self.expando();
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
                $(self.rooms[data.room].room_view[0]._dom)
                                       .find('.closeChat')
                                       .click(function() {
                                           $.getJSON('/end/' + data.room);
                                           self.close(data.room);
                                       });
                self.messageControlsDisabled(false);

                if(!self.active_room)
                    self.active_room = data.room;
                self.expando();
            }
        });
    },

    expando: function() {
        var data = uki('#users').data().slice();
        while(itm = data.shift()) {
            for(var i = 0, ld = uki('#users')[0].listData().length;
                i < ld;
                i++) {
                if(uki('#users')[0].listData()[i] == itm) {
                    uki('#users')[0].open(i);
                    break;
                }
            }
        }
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
                    } else {
                        this.guests[user].constructor();
                    }
                break;

                case 'dequeued':
                    this.guests[user].dequeue();
                break;
            }

            this.expando();
        } else if(data.users.length > 1) {
            switch(data.details) {
                case 'assigned':
                    if(!(data.users[1] in this.agents) ||
                       !(data.users[0] in this.guests)) {
                        return false; // error!
                    }

                    this.agents[data.users[1]].assign(this.guests[data.users[0]]);
                break;

                case 'unassigned':
                    if(!(data.users[1] in this.agents) ||
                       !(data.users[0] in this.guests)) {
                        return false; // error!
                    }

                    this.agents[data.users[1]].unassign(this.guests[data.users[0]]);
                break;
            }
        }
    },

    message: function(data) {
        if(data.room in this.rooms)
            this.rooms[data.room].addMessage(data.user,
                                             data.body,
                                             data.user == USERNAME);
        else if(!data.room.length) {
            if(!(data.user in this.dms)) {
                this.dms[data.user] = new Room(data.user.replace(/[^A-Za-z0-9_-]/, ''));

                var list = uki('#users'),
                    list_data = list.data();
                list_data[3].children.push({
                    username: data.user,
                    data: data.user
                });
                list.data(list_data);
            }

            this.dms[data.user].addMessage(data.user,
                                           data.body,
                                           data.user == USERNAME);
        }
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
        if(data.room in this.rooms) {
            this.rooms[data.room].addMessage('This room has been terminated.');
            this.rooms[data.room].active = false;
            if(this.active_room == data.room)
                this.messageControlsDisabled(true);
        }
    },

    close: function(room) {
        this.rooms[room].destroy();
        delete this.rooms[room];

        if(room == this.active_room) {
            var old_room = this.active_room;
            for(var rm in this.rooms) {
                this.rooms[rm].show();
                this.active_room = rm;
                if(!this.rooms[rm].active)
                    this.messageControlsDisabled(true);
                break;
            }
            if(this.active_room == old_room) {
                this.active_room = null;
                this.messageControlsDisabled(true);
            }
        }
    },

    transfer: function() {
        var transfer_to = uki('#transfer-to'),
            agent = transfer_to.value(),
            self = this;
        $.post('/transfer/' + this.active_room, {agent: agent}, function(data) {
            if(data.type == 'success') {
                $('#overlay, #transfer-win').hide();
                transfer_to.value('');
                self.close(self.active_room);
            }
        }, 'json');
    },

    receiveTransfer: function(data) {
        this.rooms[data.room] =
            new Room(data.room, data.topic, data.guest);
        $(this.rooms[data.room].room_view[0]._dom)
                               .find('.closeChat')
                               .click(function() {
                                   $.getJSON('/end/' + data.room);
                                   self.close(data.room);
                               });
        this.expando();
        if(!this.active_room) {
            this.active_room = data.room;
            this.messageControlsDisabled(false);
        }
    },

    status: function(state) {
        $.post('/status', {status: state});
    },

    statusUpdate: function(data) {
        if(data.of == 'availability' && data.user in this.agents) {
            this.agents[data.user].availability(data.is);
        }
    },

    messageControlsDisabled: function(state) {
        uki('#send, #body, #transfer-guest').disabled(state);
        $(uki('#body')[0].dom()).css('cursor', state ? 'default' : 'text')
                                .find('input')
                                    .attr('disabled', state ? 'disabled' : '')
                                    .css('cursor', state ? 'default' : 'text');
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

    var message_list_container = $(uki('#messages').dom())
                               .find('div').css('overflow-y', 'scroll');
    this.message_list = $('<ol class="message-list">')
                       .appendTo(message_list_container);

    this.room = null;
    this.actions = {
        'message': this.message,
        'notification': this.notification,
        'joined': this.join,
        'left': this.leave,
        'end': this.end,
        'qpos': this.queuePosition
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

        this.message_list.append(msg);
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
    },

    queuePosition: function(data) {
        this.addMessage('You are now number ' + data.position + ' in the queue; ' +
                        'Wait time is approximately ' + Math.floor(data.wait / 60) +
                        ' minutes.');
    }
});

var chat;
