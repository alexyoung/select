var Client = require('mysql').Client,
    url = require('url');

function MySQL(delegate) {
  this.delegate = delegate;
}

MySQL.prototype = {
  // TODO: Reuse connections? Connection pooling?
  //       what does the mysql module do/recommend?
  connect: function(connectionString, fn) {
    this.connectionString = connectionString;
    var curl = url.parse(connectionString);
    this.options = {};
    this.options.database = curl.pathname.replace(/\//, '');
    this.options.user = curl.auth ? curl.auth.split(':')[0] : '';
    this.options.password = curl.auth ? curl.auth.split(':')[1] : '';
    this.options.host = curl.hostname;
    this.options.port = curl.port || 3306;
    this.client = this.createConnection(fn);
    this.client.connect();
    fn();
  },

  error: function(err) {
    this.delegate.emit('error', err);
  },

  createConnection: function(fn) {
    return new Client(this.options);
  },

  // I didn't want the single quotes
  escape: function(val) {
    if (val === undefined || val === null) {
      return 'NULL';
    }

    switch (typeof val) {
      case 'boolean': return (val) ? 'true' : 'false';
      case 'number': return val+'';
    }

    if (typeof val === 'object') {
      val = val.toString();
    }

    val = val.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) {
      switch(s) {
        case "\0": return "\\0";
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\b": return "\\b";
        case "\t": return "\\t";
        case "\x1a": return "\\Z";
        default: return "\\"+s;
      }
    });
    return val;
  },

  find: function(collection, query, options, fn) {
    var self = this,
        parts = [],
        values = [],
        keys = [],
        order;

    options = options || {};

    if (typeof query === 'number' || typeof query === 'string') {
      parts.push('WHERE ' + this.delegate.primaryKey + ' = ?');
      values.push(query);
    } else if (typeof query === 'object') {
      keys = Object.keys(query);
      parts.push('WHERE ' + keys.map(function(k) { return k + ' = ?'; }).join(' AND '));
      keys.forEach(function(k) { values.push(query[k]); });
    }

    if (options.sort) {
      order = options.sort;
      if (typeof order === 'string') order = [order, 'ASC'];
      if (!order[1]) order[1] = 'ASC';
      parts.push('ORDER BY ' + this.escape(order[0]) + ' ' + this.escape(order[1]));
    }

    if (options.limit) {
      parts.push('LIMIT ?');
      values.push(options.limit);
    }

    if (options.offset) {
      parts.push('OFFSET ?');
      values.push(options.offset);
    }

    this.client.query(
      'SELECT * FROM ' + collection + ' ' + parts.join(' '),
      values,
      function(err, results, fields) {
        if (err) self.error(err);
        if (fn) fn(err, results || []);
        self.client.end();
      }
    );
  },

  add: function(collection, options, fn) {
    var keys = Object.keys(options),
        self = this;

    this.client.query(
      'INSERT INTO ' + collection + ' ' +
      'SET ' + keys.map(function(k) { return k + ' = ?'; }).join(', '),
      keys.map(function(k) { return options[k]; }),
      function(err, results) {
        if (err) self.error(err);
        if (fn) fn(err, results);
        self.close();
      }
    );
  },

  update: function(collection, original, record, fn) {
    var self = this,
        keys = Object.keys(record),
        originalKeys = Object.keys(original),
        values = keys.map(function(k) { return record[k]; }),
        originalValues = originalKeys.map(function(k) { return original[k]; });

    this.client.query(
      'UPDATE ' + collection + ' ' +
      'SET ' + keys.map(function(k) { return k + ' = ?'; }).join(', ') +
      'WHERE ' + originalKeys.map(function(k) { return k + ' = ?'; }).join(' AND '),
      values.concat(originalValues),
      function(err, results) {
        if (err) self.error(err);
        if (fn) fn(err, results);
        self.close();
      }
    );
  },

  remove: function() {
    var collection, original, fn, keys,
        query, values,
        self = this;

    if (arguments.length == 2) {
      collection = arguments[0];
      fn = arguments[1];
      query = 'DELETE FROM ' + collection;
      this.client.query(
        query,
        function(err, results) {
          if (fn) fn(err, results);
          self.close();
          if (err) self.error(err);
        }
      ).on('error', function() {
        self.close();
      });
    } else if (arguments.length === 3) {
      collection = arguments[0];
      original = arguments[1];
      keys = Object.keys(original);
      fn = arguments[2];
      query = 'DELETE FROM ' + collection + ' ' +
              'WHERE ' + keys.map(function(k) { return k + ' = ?'; }).join(' AND ');
      values = keys.map(function(k) { return original[k]; });

      if (keys.length === 0) {
        this.close();
        fn();
        return;
      }

      this.client.query(
        query,
        values,
        function(err, results) {
          if (err) self.error(err);
          if (fn) fn(err, results);
          self.close();
        }
      ).on('error', function() {
        self.close();
      });
    }
  },

  raw: function(sql, fn) {
    var self = this;
    this.client.query(sql, function(err, results) {
      if (err) self.error(err);
      if (fn) fn(err, results);
      self.close();
    });
  },

  close: function() {
    if (this.client) {
      this.client.end();
      delete this.client;
    }
  }
};

module.exports = MySQL;

