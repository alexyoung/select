/*!
 * Select
 * Copyright (C) 2011 Alex R. Young
 * MIT Licensed
 */

/**
 * 
 */
var path = require('path'),
    Chain = require(path.join(__dirname, 'chain')),
    states = require(path.join(__dirname, 'states')),
    parser = require(path.join(__dirname, 'selector_parser')),
    EventEmitter = require('events').EventEmitter,
    events = new EventEmitter();

/**
 * The main `select()` function.  Use `select('selector')` with a collection or table name to start a chain.
 *
 * @param {String} selector A selector.  For example, `'users'`, `'users[name="Alex"]'`
 * @returns {Object} A `select` object that can be subsequently called with database operations
 */
select = function(selector) {
  return new select.fn.init(selector, select.db);
};

/**
 * Set this with a database connection URI.  Examples:
 *
 *      select.db = 'mysql://root@localhost/select-test';
 *      select.db = 'mongodb://localhost/select-test';
 */
select.db = null;

/**
 * Use this to change the default primary key.
 */
select.primaryKey = null;

/**
 * Access the underlying database library.  For example, with MySQL:
 *
 *       select().raw('SELECT * FROM users',
 *                    function(err, results) {});
 * 
 * @param {Object|String} A query suitable for the underlying database API
 * @returns {Object} A `select` object
 */
select.raw = function() {
  var s = new select.fn.init('', select.db);
  s.raw.apply(s, arguments);
  return s;
};

select.on = function(name, fn) {
  events.on(name, fn);
};

select.emit = function(name, param) {
  events.emit(name, param);
}

select.states = states;

select.fn = select.prototype = {
  constructor: select,

  init: function(selector, db) {
    var s = parser.parse(selector);
    this.collection = s.collection;
    this.length = 0;
    this.chain = new Chain(this);
    this.db = db;
    this.applyParsedTokens(s);
    return this;
  },

  applyParsedTokens: function(s) {
    if (s.find) {
      this.find(s.find);
    }
  },

  emit: function(name, param) {
    select.emit(name, param);
  },

  primaryKey: select.primaryKey,

  defaultPrimaryKeys: {
    mysql:   'id',
    mongodb: '_id',
    memory:  'id',
    couchdb: 'id'   // TODO
  },

  setValues: function(values) {
    this.length = values.length;
    for (var i = 0; i < values.length; i++) {
      this[i] = values[i];
    }
  },

  toArray: function() {
    var values = [];
    for (var i = 0; i < this.length; i++) {
      values.push(this[i]);
    }
    return values;
  },

  /**
   * Add a new record to the database.
   *
   *      select('users').
   *        add({ name: 'Bill Adama' });
   *
   * @param {Object} record An object containing values for a new record in the collection.
   * @param {Function} fn An optional callback
   * @returns {Object} The current `select` object
   */
  add: function(record, fn) {
    var self = this;
    this.chain.push(states.write, function(client, next) {
      client.add(self.collection, record, next(fn));
    });
    return this;
  },

  /**
   * Modify attributes.
   *
   *      select('users').
   *        find(1).
   *        attr({ name: 'William Adama' });
   *
   * @param {Object} record An object containing values for a new record in the collection.
   * @param {Function} fn An optional callback
   * @returns {Object} The current `select` object
   */
  attr: function(record, fn) {
    var self = this;
    this.chain.push(states.write | states.update, function(client, next) {
      // TODO: what about updating sets of records based on queries?
      var finishedCallbacks = self.length;
      function done() {
        finishedCallbacks--;
        if (finishedCallbacks == 0) {
          if (fn) fn();
        }
      }

      for (var i = 0; i < self.length; i++) {
        client.update(self.collection, self[i], record, done);
      }

      if (self.length === 0 && fn) fn();
    });
    return this;
  },

  /**
   * Delete the current set of values, or pass a delete query to bulk delete.
   *
   * Delete all:
   *
   *      select('users').del();
   *
   * Delete by ID:
   *
   *      select('users').del(1);
   *
   * Delete with a query:
   *
   *      select('users').del({ name: 'William Adama' });
   *
   * Delete current set of values:
   *
   *      select('users').find({ type: 'trial' }).del();
   *
   * @returns {Object} The current `select` object
   */
  del: function() {
    // FIXME: Value delete is causing problems, potentially just in mongodb
    var self = this,
        fn,
        query = null;

    if (arguments.length) {
      for (var i = 0; i < arguments.length; i++) {
        if (typeof arguments[i] === 'function') {
          fn = arguments[i];
        } else if (typeof arguments[i] === 'object') {
          query = arguments[i];
        } else if (typeof arguments[i] === 'string' || typeof arguments[i] === 'number') {
          query = arguments[i];
        }
      }
    }

    if (this.chain.stack.length === 0 && !query) {
      this.chain.push(states.write | states.update, function(client, next) {
        client.remove(self.collection, fn);
      });
    } else if (query) {
      this.find(query);
      this.del(fn);
    } else {
      this.chain.push(states.write | states.update, function(client, next) {
        for (var i = 0; i < self.length; i++) {
          client.remove(self.collection, self[i], fn);
        }
        if (self.length === 0) client.close();
        next(fn);
      });
    }
    return this;
  },

  /**
   * Find records.
   *
   * Find based on ID:
   *      select('users').
   *        find(1, function(err, values) {});
   *
   * Find based on attributes:
   *      select('users').
   *        find({ type: 'admin' }).
   *        each(function() { console.log(this); });
   *
   * @returns {Object} The current `select` object
   */
  find: function(options, fn) {
    var self = this;
    this.chain.push(fn ? (states.read | states.exec | states.once) : states.read, function(client, next) {
      self.setValues([]);
      client.find(self.collection, options, self.chain.readOptions, next(function(err, values) {
        self.setValues(values);
        if (fn) fn(err, values);
      }));
    });
    return this;
  },

  /**
   * Limit the next database find query.
   * TODO: del/attr
   *
   * @param {Number} limit Limits the next find() by this amount
   * @returns {Object} The current `select` object
   */
  limit: function(limit) {
    this.chain.push(states.read | states.modify, { limit: limit });
    return this;
  },

  /**
   * Offset the next database find query.
   * TODO: del/attr
   *
   * @param {Number} offset Offset the next find() by this amount
   * @returns {Object} The current `select` object
   */
  offset: function(offset) {
    this.chain.push(states.read | states.modify, { offset: offset });
    return this;
  },

  /**
   * Sorts the results of the next find.
   * TODO: del/attr
   *
   *      select('users').
   *        find().
   *        sort('name').
   *        each(function() { console.log(this); });
   *
   * @returns {Object} The current `select` object
   */
  sort: function() {
    this.chain.push(states.read | states.modify, { sort: arguments });
    return this;
  },

  /**
   * Causes the previous `find()` to run, and iterates over the results.
   * In the passed in callback, `this` will refer to each value.
   *
   *      select('users').
   *        find().
   *        sort('name').
   *        each(function() { console.log(this); });
   *
   * @param {Function} fn A callback that will be run for each value
   * @returns {Object} The current `select` object
   */
  each: function(fn) {
    this.chain.push(states.read | states.exec, fn);
    return this;
  },

  /**
   * Receives all of the values for the previous operations.
   * When a query produces an empty set, `each` won't run, but `values` would.
   *
   *      select('users').
   *        find().
   *        sort('name').
   *        values(function(err, values) { console.log(values); });
   *
   * @param {Function} fn A callback that gets `err` and `values` 
   * @returns {Object} The current `select` object
   */
  values: function(fn) {
    var self = this;
    this.chain.push(states.exec, function() {
      if (fn) fn(self.toArray());
    }); 
    return this;
  },

  /**
   * Causes the current chain to execute.
   */
  end: function(fn) {
    this.chain.push(states.read | states.exec, fn);
    // TODO: Is this right?
    return select(this.collection);
  },

  /**
   * This adds a callback to run once other database operations have finished.
   *
   * @param {Function} fn The callback
   * @returns {Object} The current `select` object
   */
  after: function(fn) {
    this.chain.push(states.after, fn);
    return this;
  },

  raw: function(query, fn) {
    var self = this;
    this.chain.push(states.write | states.update, function(client, next) {
      client.raw(query, fn, self.collection, next);
    });
    return this;
  }
};

select.fn.init.prototype = select.fn;
module.exports = select;
