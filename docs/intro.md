`select` is a database library.

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

* Concerned with schema
* An ORM
* A validation library

## License 

The MIT License

Copyright (c) 2011 Alex R. Young

