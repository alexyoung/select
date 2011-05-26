var url = require('url'),
    data = {};

function Memory(delegate) {
  this.delegate = delegate;
}

Memory.prototype = {
  connect: function(connectionString, fn) {
    this.connectionString = connectionString;
    fn();
  },

  initCollection: function(collection) {
    if (!data[collection])
      data[collection] = [];
  },

  matchAll: function(collection, query, i) {
    return Object.keys(query).every(function(key) {
      return data[collection][i] && data[collection][i][key] === query[key];
    });
  },

  find: function(collection, query, options, fn) {
    this.initCollection(collection);

    var results = [],
        sortedData = [],
        start = 0,
        count = data[collection].length,
        order;

    if (options.offset) start = options.offset;
    if (options.limit)  count = start + options.limit;
    if (options.sort)   order = options.sort;
    if (count > data[collection].length) count = data[collection].length;

    if (order && typeof order === 'string') {
      order = [order];
      order.push('asc');
    }

    sortedData = data[collection];

    if (order) {
      var sort = function(a, b) {
        if (a[order[0]] < b[order[0]]) {
          return -1;
        } else if (a[order[0]] > b[order[0]]) {
          return 1;
        }
        return 0;
      };
      sortedData = sortedData.sort(order[1] == 'desc' ? function(a, b) { return sort(b, a); } : sort);
    }

    if (typeof query === 'undefined') {
      results = sortedData.slice(start, count);
    } else if (typeof query === 'number' || typeof query === 'string') {
      for (var i = start; i < count; i++) {
        if (sortedData[i] && sortedData[i][this.delegate.primaryKey] === query) {
          results.push(sortedData[i]);
        }
      }
    } else if (typeof query === 'object') {
      for (var i = start; i < count; i++) {
        if (this.matchAll(collection, query, i)) {
          results.push(sortedData[i]);
        }
      }
    }

    if (fn) fn(null, results);
  },

  add: function(collection, options, fn) {
    this.initCollection(collection);
    data[collection].push(options);
    if (fn) fn(null, options);
  },

  update: function(collection, original, record, fn) {
    if (!data[collection]) data[collection] = [];
    for (var i = 0; i < data[collection].length; i++) {
      if (this.matchAll(collection, original, i)) {
        for (var key in record) {
          data[collection][i][key] = record[key];
        }
      }
    }

    if (fn) fn();
  },

  remove: function() {
    var collection, original, fn;

    if (arguments.length == 2) {
      collection = arguments[0];
      fn = arguments[1];
    } else if (arguments.length === 3) {
      collection = arguments[0];
      original = arguments[1];
      fn = arguments[2];
    }

    if (!data[collection]) data[collection] = [];

    if (original) {
      for (var i = 0; i < data[collection].length; i++) {
        if (this.matchAll(collection, original, i)) {
          data[collection].splice(i, 1);
        }
      }
    } else {
      data[collection] = [];
    }

    if (fn) fn();
  },

  raw: function(str, fn) {
  },

  close: function() {
  }
};

module.exports = Memory;

