function Parser(input) {
  this.input = input;
}

Parser.parse = function(input) {
  return new Parser(input).parse();
};

Parser.prototype = {
  // TODO: Parser
  buildQuery: function() {
    var query = {},
        matches = this.input.match(/([^[]*)\[([^\]]*)/),
        f;
    query.collection = matches[1];
    query.find = {};

    f = matches[2].split(',');
    f.forEach(function(v) {
      var params = v.split('=').map(function(w) {
        return w.trim().replace(/['"]/g, '');
      });
      query.find[params[0]] = params[1];
    });
    return query;
  },

  parse: function() {
    if (!this.input) return {};

    if (this.input.indexOf('[') === -1) {
      return {
        collection: this.input
      };
    } else {
      return this.buildQuery();
    }
  }
};


module.exports = Parser;
