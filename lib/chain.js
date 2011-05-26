var path = require('path'),
    states = require(path.join(__dirname, 'states'));

function Operation(options) {
  this.type = options.type;
  this.fn = options.callback;
  this.scheduler = options.scheduler;
  this.delegate = options.scheduler.delegate;
  this.db = this.delegate.db;
  this.finished = options.finished;
  this.done = false;
}

Operation.prototype = {
  run: function() {
    if (this.done) return;

    // These are getting too unwieldy
    if ((this.type == states.read)
        || (this.type == states.write)
        || (this.type == (states.read | states.exec | states.once))
        || (this.type == (states.write | states.update))) {
      this.connect(this.fn);
    } else if (this.type == (states.read | states.exec)) {
      for (var i = 0; i < this.delegate.length; i++) {
        if (this.fn)
          this.fn.apply(this.delegate[i], [i]);
      }
    } else if (this.type & states.after) {
      this.fn();
    } else if (this.type == states.exec) {
      this.fn();
    }
    this.done = true;
  },

  connect: function(fn) {
    var client = this.loadDatabaseDriver(),
        self = this;
    client.connect(this.db, function(err) {
      if (err) {
        throw(err);
      } else {
        fn(client, function(callback) {
          return function() {
            if (callback) callback.apply(self.select, arguments);
            self.finished();
            self.scheduler.readOptions = {};
          }
        });
      }
    });
  },

  databaseLibraryName: function() {
    switch (this.db.split(':')[0]) {
      case 'mongodb': return 'mongodb';
      case 'http':    return 'couchdb';
      case 'mysql':   return 'mysql';
      case 'memory':  return 'memory';
    }
  },

  databaseLibrary: function() {
    var library = this.databaseLibraryName();
    if (!this.delegate.primaryKey) {
      this.delegate.primaryKey = this.delegate.defaultPrimaryKeys[library];
    }
    return path.join(__dirname, 'drivers', library);
  },

  loadDatabaseDriver: function() {
    try {
      var Lib = require(this.databaseLibrary());
      return new Lib(this.delegate);
    } catch (e) {
      console.log('Missing library.  Please run npm install -g ' + this.databaseLibrary());
      throw(e);
    }
  }
};

function Chain(delegate) {
  this.delegate = delegate;
  this.operations = [];
  this.stack = [];
  this.readOptions = {};
}

Chain.prototype = {
  run: function() {
    var operation = this.operations.shift();
    if (operation) operation.run();
  },

  push: function(type, fn) {
    var self = this;
    this.stack.push(type);
      
    if (!((type & states.read) && (type & states.modify))) {
      this.operations.push(new Operation({
        scheduler: this, 
        type: type,
        callback: fn,
        finished: function() {
          self.run();
        }
      }));
 
      if (type !== states.read) this.run();
    }

    if ((type & states.read) && (type & states.modify)) {
      for (var i in fn) {
        this.readOptions[i] = fn[i];
      }
    }
  }
};

module.exports = Chain;
