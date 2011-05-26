var CouchClient = require('couch-client');

function CouchDB() {
}

CouchDB.prototype = {
  connect: function(connectionString, fn) {
    this.connectionString = connectionString;
    this.dbName = connectionString.split('/').slice(-1)[0];
    fn();
  },

  createConnection: function(fn) {
    fn();
  },

  find: function(collection, query, options, fn) {
    var self = this;

    function sendResults(err, docs) {
      if (!err && typeof fn !== 'undefined') {
        if (typeof docs !== 'array') docs = [docs];
        if (fn) fn(err, docs);
      } else {
        console.log(err);
      }
    }

    if (!query) {
      // curl "http://127.0.0.1:5984/select-test/_all_docs?include_docs=true"
    } else if (typeof query === 'object') {
      // TODO: create a view?
    } else if (typeof query === 'string' || typeof query === 'integer') {
      var client = CouchClient(this.connectionString);
      if (collection) {
        var design = collection.split('/')[0],
            view   = collection.split('/')[1];
        // this.dbName + '/_design/' + design + '/_view/' + view
        client.view(collection, { key: query }, function(err, docs) {
          if (docs.rows) {
            docs = docs.rows.map(function(d) { return d.value; });
            sendResults(err, docs);
          }
        });
      } else {
        client.get(query, function(err, docs) {
          sendResults(err, docs);
        });
      }
    }
  },

  add: function(collection, options, fn) {
    var client = CouchClient(this.connectionString + '/' + collection);
    client.save(options, function(err, doc) {
      if (err) console.log(err);
      if (!err && typeof fn !== 'undefined') {
        fn(err, doc);
      }
    });
  },

  update: function(collection, original, record, fn) {
  },

  remove: function(collection, original, fn) {
  },

  close: function() {
  }
};

module.exports = CouchDB;

