require.paths.unshift('./libs');
var kiwi = require('kiwi'),
    sys = require('sys'),
    fs = require('fs'),
    crypto = require('crypto');

kiwi.require('express', '= 0.13.0');
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
    set('root', __dirname);
});

get('/', function() {
    this.session.respond(200, sys.inspect(this.session), true);
});

get('/c', function() {
    this.render('chat.html.haml', {
        locals: {
            'title': this.session.get('username') +
                     ' | ' + this.session.type + ' | Mozilla Live Chat',
            'js': this.session.type
        }
    });
});

get('/listen', function() {
    chat.manager.putGuestInQueue(this.session);
});

get('/guests', function() {
    // Return list of queued / not queued guests
    this.session.respond(200, chat.manager.queue, true);
});

get('/assist', function() {
    // Dequeue guest, create new room for users.
    chat.manager.assignNextGuestToThisAgent(this.session);
})

post('/message', function() {
    chat.manager.with_(this.session, this.param('id'))('send',
        new chat.Message(
            this.session,
            this.params.post.body || ''
        ));
});

post('/message/:id', function(id) {
    // Send message to room :id
    chat.manager.with_(this.session, id)('send', new chat.Message(
        this.session,
        this.params.post.body || ''
    ));
});

post('/message/:id/typing', function(id) {
    var states = ['off', 'on', 'wait'];
    chat.manager.with_(this.session, id)('send', new chat.Status(
        this.session,
        'typing',
        states.indexOf(this.param('state')) > -1 ?
            this.param('state') : states[0]
    ));
});

get('/join/:id', function(id) {
    // Join room :id
    chat.manager.with_(this.session, id)('join');
});

get('/leave/:id', function(id) {
    // Leave room :id
    chat.manager.with_(this.session, id)('leave');
});

get('/end/:id', function(id) {
    // Destroy room :id
    chat.manager.destroyRoom(this.session, id);
});

get('/create/:name', function(name) {
    // Create room :name
    chat.manager.initRoom(this.session, name);
});

get('/sendmsg', function(name) {
    this.render('send.html.haml', {
        locals: {title: "Send a message"}
    });
});

var server = run(APP_PORT, APP_HOST);

if(SSL_KEY && SSL_CERT) {
    try {
        var cred_key = fs.readFileSync(SSL_KEY, 'ascii'),
            cred_cert = fs.readFileSync(SSL_CERT, 'ascii');
        
        server.setSecure(crypto.createCredentials({
            key: cred_key,
            cert: cred_cert
        }));
    } catch(e) {
        sys.log('Could not find SSL key/cert; server will not run on HTTPS!');
    }
}
