# select

`select` is a database library.

Supported databases:

* MySQL
* MongoDB
* Memory
* CouchDB (partial)
* Planned: PostgreSQL, SQLite
* Researching: Riak, Redis, selector language

## Installation

      $ npm install select

## Examples

      // Find some items and iterate
      select('users')
        .find({ name: 'Alex' })
        .limit(3)
        .offset(8)
        .each(function(index) {
          console.log(this);
        });

      // Update an attribute
      select('users')
        .find(17)
        .attr({ name: 'Yuka' });

      // Create
      select('users')
        .add({
          name: 'Bob',
          email: 'bob@example.com'
        });

      // Delete
      select('users')
        .find(1)
        .del();

      // Selector language
      select('users[name="Alex", email="alex@example.com"]').
        values(function(values) {});

## Philosophy

`select` is:

* A quick way of using common database features
* Easy to learn for JavaScript developers
* Easy to extend

`select` is not:

* For building schemas
* An ORM
* A validation library

## License 

(The MIT License)

Copyright (c) 2011 Alex R. Young

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

