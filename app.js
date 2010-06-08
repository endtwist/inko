require.paths.unshift('./libs');
var kiwi = require('kiwi'),
    sys = require('sys');
    
kiwi.require('express', '= 0.13.0');
require('express/plugins');
Object.merge(global, require('ext'));

Object.merge(global, require('./settings'));
try { Object.merge(global, require('./settings.local')); } catch(e) {}

require('./session_models');
require('./util');

configure(function() {
    use(Logger);
    use(MethodOverride);
    use(Cookie);
    use(Session.Djangofied, {lifetime: (15).minutes,
                             reapInterval: (1).minute,
                             dataStore: Store.MemoryExtended});
    set('root', __dirname);
});

get('/', function() {
    this.respond(200, sys.inspect(this.session));
});

get('/auth', function(type) {
    this.render('login.html.haml', {
        locals: {
            title: 'Sign In'
        }
    });
});

get('/auth/:type', function(type) {
    this.redirect('/auth');
});

post('/auth/agent', function() {
    var self = this,
        fields = ['username', 'password'];
    
    if(Object.keys(this.params.post).excludes(fields)) {
        this.respond(200, 'invalid');
        return;
    }
    
    var agent_data = Object.reject(this.params.post, function(v, k, o) {
                         return !(k in fields);
                     });
    agent_data.maxGuests = 1;
    
    this.session = this.session.become('agent', agent_data, function(auth) {
                        if(auth) {
                            self.respond(200, sys.inspect(self.session));
                        } else {
                            self.respond(200, 'invalid');
                        }
                   });
});

post('/auth/guest', function() {
    var self = this,
        fields = ['username', 'question', 'extensions', 'version', 'os'];
        
    if(Object.keys(this.params.post).excludes(fields)) {
        this.respond(200, 'invalid');
        return;
    }
    
    var guest_data = Object.reject(this.params.post, function(v, k, o) {
                         return !(k in fields);
                     });
    
    this.session = this.session.become('guest', guest_data);

    this.respond(200, sys.inspect(self.session));
});

get('/testsql', function(id) {
    var self = this;
    db.query('SELECT * FROM forums_post LIMIT 1;');
    db.addListener('result', function(result) {
        self.render('test.html.haml', {
            locals: {
                title: 'wtf',
                user: result.ROWS[0][2]
            }
        });
    });
    db.addListener('error', function(result) {
        sys.puts(result);
    });
});

run(APP_PORT, APP_HOST);
