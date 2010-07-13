require.paths.unshift(require.paths[0] + '/express');
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

get('/sendmsg', function(name) {
    this.render('send.html.haml', {
        locals: {title: "Send a message"}
    });
});

var server = run(APP_PORT, APP_HOST);