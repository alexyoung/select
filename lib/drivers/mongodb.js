var mongodb = require('mongodb'),
    Db = mongodb.Db,
    Server = mongodb.Server,
    url = require('url');

function MongoDB(delegate) {
  this.connected = false;
  this.delegate = delegate;
}

MongoDB.prototype = {
  connect: function(connectionString, fn) {
		var uri = url.parse(connectionString),
        options = {};

    this.host = uri.hostname;
    this.port = uri.port || 27017;
    this.database = uri.pathname.replace(/^\//, '');

    if (uri.auth) {
      options.auth = uri.auth.split(':'),
      options.username = auth[0],
      options.password = auth[1];
    }

    this.options = options;
    this.client = this.createConnection(fn);
  },

  error: function(err) {
    this.delegate.emit('error', err);
  },

  createConnection: function(fn) {
    var self = this,
        client = new Db(this.database, new Server(this.host, this.port, this.options));

    client.open(function(err, client) {
			if (!err && self.options.username) {
				client.authenticate(self.options.username, self.options.password, function(err, success) {
					if (success) {
            fn();
          } else {
            // Throw authentication errors
            throw(err);
          }
        });
      } else if (!err) {
        fn();
      } else {
        if (err) self.error(err);
      }
    });

    return client;
  },

  find: function(collection, query, options, fn) {
    var self = this,
        primaryKey;
    options = options || {};
    query = query || {};

    // TODO: ObjectID?
    if (typeof query === 'number' || typeof query === 'string') {
      primaryKey = query;
      query = {};
      query[this.delegate.primaryKey] = new this.client.bson_serializer.ObjectID(primaryKey);
    }

    if (options.offset) {
      options.skip = options.offset;
      delete options.offset;
    }

    if (options.sort) {
      options.sort = [[options.sort[0], options.sort[1] || 'asc']];
    }

    this.client.createCollection(collection, function(err, c) {
      var cursor = c.find(query, options);
      cursor.count(function(err, count) {
        cursor.toArray(function(err, docs) {
          if (err) self.error(err);
          if (fn) fn(err, docs);
          self.close();
        });
      });
    });
  },

  add: function(collection, options, fn) {
    var self = this;
    this.client.createCollection(collection, function(err, c) {
      c.insert(options, function(err, docs) {
        if (err) self.error(err);
        if (!err && typeof fn !== 'undefined') {
          fn(err, docs);
        }
        self.close();
      });
    });
  },

  update: function(collection, original, record, fn) {
    var self = this;

    this.client.createCollection(collection, function(err, c) {
      c.update(original, { $set: record }, { safe: true }, function(err) {
        if (err) self.error(err);
        if (!err && typeof fn !== 'undefined') {
          // TODO: pass values?
          fn(err);
        }
        self.close();
      });
    });
  },

  remove: function() {
    var collection, original, fn, query;

    if (arguments.length == 2) {
      collection = arguments[0];
      fn = arguments[1];
      query = {};
    } else if (arguments.length === 3) {
      collection = arguments[0];
      original = arguments[1];
      fn = arguments[2];
      // TODO: should this be _id or what the find() returned?
      query = {};
      query[this.delegate.primaryKey] = original[this.delegate.primaryKey];
    }

    var self = this;

    this.client.createCollection(collection, function(err, c) {
      c.remove(query, function(err, c) {
        if (err) self.error(err);
        if (!err && typeof fn !== 'undefined') {
          fn(err);
        }
        self.close();
      });
    });
  },

  raw: function(fn, _, collection, next) {
    var self = this;
    this.client.createCollection(collection, function(err, c) {
      fn(c, function() {
        self.close();
        next();
      });
    });
  },

  close: function() {
    if (this.client) {
      this.client.close();
      delete this.client;
    }
  }
};

module.exports = MongoDB;
