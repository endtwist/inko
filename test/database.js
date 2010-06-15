var fs = require('fs'),
    path = require('path'),
    sys = require('sys');

var kiwi = require('kiwi');
kiwi.require('express', '= 0.13.0');
require('express/utils');
Object.merge(global, require('ext'));

require('../settings');
try { Object.merge(global, require('../settings.local')); } catch(e) {}
var dbslayer = require('../libs/dbslayer'),
    db = new dbslayer.Server(DBSLAYER_HOST, DBSLAYER_PORT);
    
db.addListener('error', function(error, errno) {
    sys.puts(errno + ': ' + error);
});

var databases = {};

exports.fixture = function(name) {
    return path.join(__dirname, 'fixtures', name + '.json');
};

exports.use = function(dbjson, callback) {
    var data = fs.readFileSync(dbjson, 'utf-8');
    data = JSON.parse(data);
    var name = data.name,
        columns = data.columns,
        rows = data.rows,
        columns_kv = [];
    databases[dbjson] = name;
    for(col in columns)
        columns_kv.push(col + ' ' + columns[col]);
    db.query(sprintf('DROP TABLE IF EXISTS test_%s', name));
    db.addListener('result', function(result) {
        db.removeListener('result', arguments.callee);
        db.query(sprintf('CREATE TABLE test_%s (%s) TYPE=MEMORY',
                         name,
                         columns_kv.join(', ')));
        db.addListener('result', function(result) {
            db.removeListener('result', arguments.callee);
            function add_row(next, rows) {
                db.query(sprintf('INSERT INTO test_%s VALUES (\'%s\')',
                                 name,
                                 next.join("','")));
                db.addListener('result', function(result) {
                    db.removeListener('result', arguments.callee);
                    var next = rows.shift();
                    if(next) {
                        add_row(next, rows);
                    } else {
                        callback();
                    }
                });
            }
            add_row(rows.shift(), rows);
        });
    });
}

exports.destroy = function(dbjson) {
    db.query(sprintf('DROP TABLE IF EXISTS test_%s', databases[dbjson]));
}

exports.addListener = function() { db.addListener.apply(db, arguments) };
exports.removeListener = function() { db.removeListener.apply(db, arguments) };
exports.query = function() { db.query.apply(db, arguments) };