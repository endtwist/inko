require.paths.unshift('./libs');
var kiwi = require('kiwi'),
    sys = require('sys'),
    dbslayer = require('dbslayer');
    
kiwi.require('express', '= 0.13.0');

require('./settings');

configure(function() {
    set('root', __dirname);
});

db = new dbslayer.Server(DBSLAYER_HOST, DBSLAYER_PORT);

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
