var select = require('select');

exports['test init'] = function(test, assert) {
  assert.ok(select());
  test.finish();
};
