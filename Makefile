all: test docs

test:
	@node_modules/whiskey/bin/whiskey --tests "test/memory_test.js test/mongodb_test.js test/mysql_test.js test/core_test.js"

testmongo:
	@node_modules/whiskey/bin/whiskey --tests "test/mongodb_test.js" --verbosity 2

testmysql:
	@node_modules/whiskey/bin/whiskey --tests "test/mysql_test.js" --verbosity 2

testmemory:
	@node_modules/whiskey/bin/whiskey --tests "test/memory_test.js" --verbosity 2

docs:
	@dox --title select lib/select.js -i docs/intro.md > docs/index.html

.PHONY: test docs
.SILENT: docs
