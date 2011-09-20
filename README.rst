Dataflow
========

Dataflow is a library that can be used to represent object data manipulation as a concise, jQuery-style series of
function invocations. It supports both synchronous and asynchronous operations so the programming style is the same in
both cases.

Example
-------

To illustrate this concept with an example, consider the following:

::

    var names = ["Dedekind", "Riemann", "Cauchy"];
    new taiste.DataFlow([
            { test: 123, foo: "bar", users: [0, 2],
                votes: { 0: true, 1: false, 2: true } },
            { test: 456, foo: "barbar", users: [1, 0], votes: { 0: false }}
        ])
        .pluck('users')
            .asyncMapEach(function() {
                _.delay(_.bind(function() {
                    this.setData( { name: names[this.data]} );
                    this.next();
                }, this), 250);
            }).end()
        .pluck('votes')
            .each(function(value, key) {
                var context = this;
                new taiste.DataFlow(value, undefined, undefined, true)
                    .each(function(vote, user) {
                        context.data[key][user] = {
                            vote: vote,
                            user: context.parent.users[key][user]
                        };
                    });
            }).end()
        .asyncOperation(
            function() {
                console.log("Running async op");
                _.delay(_.bind(function() {
                    this.next();
                }, this), 250);
            })
        .then(function() {
            var context = this;
            _.delay(function() {
                context.next();
            });

            return false;
        })
        .then(function() {
            console.log(this);
        });

The most important methods to understand are ``then``, ``next``, ``pluck``, ``asyncMap``, ``asyncEach``, ``map``, ``each`` and  ``mapEach``.
``then`` adds a new function to the asynchronously executed pqueue. The execution can be made asynchronous by returning
``false`` from the ``then`` function. The context contains ``next`` function that is required to be executed when the
operation finishes.

The data is contained in the context's ``data`` property, that can be manipulated.

The queue is executed in the order the items are added to it. The ``pluck`` function can be used to separate a new
"stack item" so that the following functions before ``end`` are operating with the plucked data. Pluck also accepts
wildcards and nested plucking with ``*`` and ``.``. The ``end`` can be then used to add the transformed data back to the
master object. The root object is always accessible using the ``root`` function on the context.

The ``getJSON``-method can be used to add data to the queue.

External requirements
---------------------

* jQuery_
* Underscore.js_
* `Taiste underscore extensions`_

.. _Underscore.js: http://github.com/documentcloud/underscore/
.. _`Taiste underscore extensions`: http://github.com/taiste/underscore-extensions/
.. _jQuery: http://jquery.org

Licence
-------

Licenced under MIT:: 
 
    Copyright (C) 2011 by Taiste Oy
 
    Permission is hereby granted, free of charge, to any person obtaining a copy 
    of this software and associated documentation files (the "Software"), to deal 
    in the Software without restriction, including without limitation the rights 
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
    copies of the Software, and to permit persons to whom the Software is 
    furnished to do so, subject to the following conditions: 
 
    The above copyright notice and this permission notice shall be included in 
    all copies or substantial portions of the Software. 
 
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
    THE SOFTWARE. 
