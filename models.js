var dbslayer = require('dbslayer'),
    db = new dbslayer.Server(DBSLAYER_HOST, DBSLAYER_PORT),
    PickleHack = require('./util').DjangoPickleReader;

exports.DjangoSession = new Class({
    constructor: function(sid, callback) {
        var self = this;
        sid = sid.replace(/[^A-Za-z0-9]/g, '');
        db.query(sprintf('SELECT session_data FROM django_session \
                          WHERE session_key="%s" AND expire_date > NOW() \
                          LIMIT 1',
                          sid));
        db.addListener('result', function(result) {
            if(result.ROWS.length) {
                var pkl_session = result.ROWS[0][0]
                                        .replace(/[^A-Za-z0-9+=]/g, '')
                                        .base64Decoded;
                pkl_session = pkl_session.slice(0, pkl_session.length - 32);

                try {
                    self.user_id = (new PickleHack()).id(pkl_session);
                } catch(e) {
                    self.user_id = false;
                }
            }

            db.removeListener('result', arguments.callee);

            if(!pkl_session || !self.user_id)
                return callback.call(self, false);

            db.query(sprintf('SELECT username, first_name, last_name, \
                              is_staff, is_superuser FROM auth_user \
                              WHERE id="%d" LIMIT 1',
                              parseInt(self.user_id)));
            db.addListener('result', function(result) {
                if(result.ROWS.length) {
                    var user = result.ROWS[0];
                    self.username = user[0];
                    self.first_name = user[1];
                    self.last_name = user[2];
                    self.is_staff = parseInt(user[3]);
                    self.is_superuser = parseInt(user[4]);

                    db.removeListener('result', arguments.callee);
                    db.query(sprintf('SELECT ap.codename \
                                      FROM `auth_user_groups` AS aug, \
                                      `auth_group_permissions` AS agp, \
                                      `auth_user_user_permissions` AS auup, \
                                      `auth_permission` AS ap \
                                      WHERE \
                                      (aug.user_id = %d \
                                       AND aug.group_id = agp.group_id \
                                       AND agp.permission_id = ap.id) OR \
                                      (auup.user_id = %d \
                                       AND auup.permission_id = ap.id) \
                                      GROUP BY ap.id',
                                      parseInt(self.user_id),
                                      parseInt(self.user_id)));
                    db.addListener('result', function(result) {
                        db.removeListener('result', arguments.callee);
                        self.perms = [];
                        if(result.ROWS.length) {
                            var perms = result.ROWS;
                            for(var i = 0, rl = perms.length; i < rl; i++) {
                                self.perms.push(perms[i][0]);
                            }
                        }
                        callback.call(self, self.user_id);
                    });
                } else {
                    self.user_id = false;
                    callback.call(self, self.user_id);
                }
            });
        });
        db.addListener('error', function(error, errno) {
            self.user_id = false;
            callback.call(self, self.user_id);
        });
    }
});