/*
---
name: dbslayer.js
description: Interface to DBSlayer for Node.JS
version: 0.2
author: [Guillermo Rauch](http://devthought.com)
updaters: [Robin Duckett](http://www.twitter.com/robinduckett),
	  [Barry Ezell](http://twitter.com/barryezl)
...
*/
var sys = require('sys'),
    http = require('http'),
    events = require('events'),
    booleanCommands = ['STAT', 'CLIENT_INFO', 'HOST_INFO', 'SERVER_VERSION', 'CLIENT_VERSION'];

var Server = function(host, port, timeout) {
  this.host = host || 'localhost';
  this.port = port || 9090;
  this.timeout = timeout;
};

sys.inherits(Server, events.EventEmitter);
Server.prototype.fetch = function(object, key) {
  var connection = http.createClient(this.port, this.host);
  var request = connection.request('GET', '/db?' + escape(JSON.stringify(object)), {'host': this.host});
  var server = this;

  request.addListener('response', function(response) {
    var allData = "";
    response.setEncoding('utf8');
    response.addListener('data', function(data) {
      allData += data;
    });

    response.addListener('end', function() {
      try {
        var object = JSON.parse(allData);
      } catch(e) {
        server.emit('error', e);
      }

      if (object !== undefined) {
        if (object.MYSQL_ERROR !== undefined) {
          server.emit('error', object.MYSQL_ERROR, object.MYSQL_ERRNO);
        } else if (object.ERROR !== undefined) {
          server.emit('error', object.ERROR);
        } else {
          server.emit(key.toLowerCase(), key ? object[key] : object);
        }
      }
    });
  });

  request.end();
};

Server.prototype.query = function(query){
  this.fetch({SQL: query}, 'RESULT')
  return this;
};

for (var i = 0, l = booleanCommands.length; i < l; i++){
  Server.prototype[booleanCommands[i].toLowerCase()] = (function(command){
    return function(){
      var obj = {};
      obj[command] = true;
      return this.fetch(obj, command);
    };
  })(booleanCommands[i]);
}
Server.prototype.fetch_object = function(res, callback) {
  for (var row, i = 0; i < res.ROWS.length; row = res.ROWS[i], i++) {
    var ret = {};
    if (typeof row !== "undefined") {
      for (var j = 0; j < res.HEADER.length; j ++) {
        ret[res.HEADER[j]] = row[j];
      }

      callback.apply(this, [ret]);
    }
  }
};

Server.prototype.fetch_array = function(res, callback) {
  for (var row, i = 0; i < res.ROWS.length; row = res.ROWS[i], i++) {
    var ret = [];
    if (typeof row !== "undefined") {
      for (var j = 0; j < res.HEADER.length; j ++) {
        ret[j] = row[j];
      }

      callback.apply(this, [ret]);
    }
  }
};

Server.prototype.fetch_args = function(res, callback) {
  for (var row, i = 0; i < res.ROWS.length; row = res.ROWS[i], i++) {
    var ret = [];
    if (typeof row !== "undefined") {
      for (var j = 0; j < res.HEADER.length; j ++) {
        ret[j] = row[j];
      }

      callback.apply(this, ret);
    }
  }
};

exports.Server = Server;
