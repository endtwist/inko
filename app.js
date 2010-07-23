#!/usr/bin/env node
require.paths.unshift(require.paths[0] + '/express-0.14.1');
require.paths.unshift('./libs');
var sys = require('sys'),
    fs = require('fs'),
    crypto = require('crypto');

require('express');
require('express/plugins');
Object.merge(global, require('ext'));

Object.merge(global, require('./settings'));
try { Object.merge(global, require('./settings.local')); } catch(e) {}

Object.merge(global, require('./session'));
require('./util');
var chat = require('./chat');

try {
    var daemon = require('daemon.node/daemon')
        stop_daemon = function() {
            try {
                process.kill(parseInt(fs.readFileSync(PID_FILE)));
            } catch(e) {
                sys.puts('Inko is not currently running!');
            }
        },
        start_daemon = function() {
            var pid = daemon.start();
            daemon.lock(PID_FILE);
            daemon.stdin.close();
            daemon.stdout.sendTo(LOG_FILE);
            daemon.stderr.sendTo(LOG_FILE);
        };

    switch(process.argv[2]) {
        case 'stop':
            stop_daemon();
            process.exit(0);
        break;

        case 'start':
            start_daemon();
        break;

        case 'restart':
            stop_daemon();
            start_daemon();
        break;

        case 'nodaemon':
            sys.puts('Starting without daemonizing...');
        break;

        default:
            sys.puts('Usage: [start|stop]');
            process.exit(0);
    }
} catch(e) {
    sys.puts('daemon.node not found! Please compile' +
             ' libs/daemon.node/daemon.node.');
}

configure('development', function() {
    use(Logger);
    use(Static);
});

configure(function() {
    use(MethodOverride);
    use(Cookie);
    use(Session.Djangofied, {lifetime: (15).minutes,
                             reapInterval: (1).minute,
                             dataStore: Store.MemoryExtended});
    disable('show exceptions');
    set('root', __dirname);
});

get('/debug', function() {
    this.session.respond(200, sys.inspect(this.session), true);
});

get('/', function() {
    this.render('chat.html.haml', {
        locals: {
            'title': 'Mozilla Live Chat',
            'js': this.session ? this.session.type : 'guest',
            'username': this.session ? this.session.get('username') : '',
            'agent': this.session && (this.session.type == 'agent')
        }
    });
});

get('/listen', function() {
    if(!this.session.get('username'))
        return this.session.notify({type: 'welcome'});

    chat.manager.putGuestInQueue(this.session);
});

post('/identify', function() {
    chat.manager.defineGuest(this.session, {
        username: this.params.post.username || '',
        question: this.params.post.question || '',
        os: this.params.post.question || '',
        version: this.params.post.version || '',
        extensions: this.params.post.extensions || ''
    });
});

get('/guests', function() {
    if(!this.has('type', 'agent')) return;

    // Return list of queued / not queued guests
    this.session.respond(chat.manager.queue);
});

get('/assist', function() {
    if(!this.has('type', 'agent')) return;

    // Dequeue guest, create new room for users.
    chat.manager.assignNextGuestToThisAgent(this.session);
})

get('/list', function() {
    if(!this.has('type', 'agent')) return;

    // Return a list of users and their statuses
    this.session.respond(chat.manager.userList());
});

post('/message', function() {
    if(!this.has('username')) return;

    chat.manager.with_(this.session, this.param('id'))('send',
        new chat.Message(
            this.session,
            this.params.post.body || ''
        ));
});

post('/message/:id', function(id) {
    if(!this.has('username')) return;

    // Send message to room :id
    chat.manager.with_(this.session, id)('send', new chat.Message(
        this.session,
        this.params.post.body || ''
    ));
});

post('/message/:id/typing', function(id) {
    if(!this.has('username')) return;

    var states = ['off', 'on', 'wait'];
    chat.manager.with_(this.session, id)('send', new chat.Status(
        this.session,
        'typing',
        states.indexOf(this.param('state')) > -1 ?
            this.param('state') : states[0]
    ));
});

post('/direct_message', function() {
    if(!this.has('type', 'agent')) return;

    chat.manager.directMessage(this.session, this.param('agent'),
                               this.param('body'));
});

post('/transfer/:id', function(id) {
    if(!this.has('type', 'agent')) return;

    chat.manager.transferRoom(id, this.session, this.param('agent'));
});

post('/set_limit', function() {
    if(!this.has('type', 'agent')) return;
    
    if(this.session.hasPerm('monitor_live_chat') && this.param('agent'))
        chat.manager.setLimit(this.param('agent'), this.param('limit'));
    else
        chat.manager.setLimit(this.session, this.param('limit'));
});

get('/join/:id', function(id) {
    if(!this.has('username')) return;
    // Join room :id
    chat.manager.with_(this.session, id)('join');
});

get('/leave/:id', function(id) {
    if(!this.has('username')) return;
    // Leave room :id
    chat.manager.with_(this.session, id)('leave');
});

get('/end/:id', function(id) {
    if(!this.has('username')) return;
    // Destroy room :id
    chat.manager.destroyRoom(this.session, id);
});

get('/create/:name', function(name) {
    if(!this.has('type', 'agent')) return;
    // Create room :name
    chat.manager.initRoom(this.session, name);
});

var server = run(APP_PORT, APP_HOST);