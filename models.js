var Session = function(client) {
    // Sessions are generic containers for active users

    this.client = client;

    this._authenticated = false;
    this._lastping = Date.now();

    this.authenticate = function(username) {
        
    };
    
    this.ping = function() {
        this._lastping = Date.now();
    };
    
    this.stale = function() {
        // is _lastping < (now - session_max)?
    }
};

var Agent = function(username, password) {
    // Agents are contributors; people that chats are assigned to.

    this.username = username;
    this.permissions = [];
    this.session = new Session(this);

    this._activeChats = 0;

    this.assignUser = function(user) {
        // Assign a 'User' to this 'Agent'
    };

    this._available = function() {
        // Determine if the 'Agent' can accept a new 'User'
    };

    this._init = function() {
        /* Authenticate
         * Trigger event on auth success or failure.
         */
    };
    
    this._init(password);
};

var User = function(nickname, question, extensions, version, os) {
    // Users are people looking for assistance.

    this.nickname = '';
    this.question = '';
    this.extensions = 'Unknown';
    this.version = 'Unknown';
    this.os = 'Unknown';
    this.session = new Session(this);
    
    this._agent = null;
    
    
};
