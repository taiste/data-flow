if(typeof(taiste) == 'undefined') { taiste = {}; }
(function(ns) {
    var DataFlow;
    ns.DataFlow = DataFlow = function(data, parent, key, plain) {
        // "wrap object in array"
        if(plain) {
            this.data = data;
        } else {
            this.setData(data);
        }
        this.parent = parent;

        this._key = key;
        this._callbacks = [];
        this._waiting = false;
        this._queue = parent || this;

        return this;
    };
    DataFlow.prototype.root = function() {
        var o = this;
        while(o.parent) { o = o.parent; }
        return o;
    };
    DataFlow.prototype.detachFromQueue = function() {
        this._queue = this;
        return this;
    };
    DataFlow.prototype._then = function(callback) {
        var context = this._queue;
        var self = this;
        if (context._waiting) {
            context._callbacks.push(callback);
        } else {
            context.wait();
            _.defer(function() {
                var returned = callback.call(self);
                if (returned !== false) {
                    context.next(returned);
                }
            });
        }
        return this;
    };
    DataFlow.prototype.next = function() {
        this._waiting = false;
        if (this._callbacks.length > 0) {
            this._queue._then(this._callbacks.shift());
        }
    };
    DataFlow.prototype.wait = function() {
        this._waiting = true;
    };

    DataFlow.prototype.then = function(callback) {
        var context = this;
        this._then(function() {
            callback.call(context);
        });
        return this;
    };
    DataFlow.prototype.asyncOperation = function(operation, callback) {
        var context = this;
        this._then(function() {
                this.wait();
                operation.call(context);
                return false;
            });

        if(callback) {
            this._then(callback);
        }

        return this;
    };
    DataFlow.prototype.asyncMap = function(callback) {
        var context = this;
        this._then(function() {
            var results = new Array(context.data.length);
            var num_items = context.data.length;
            var queue = context._queue;
            var singleOp = _.bind(function() {
                var args = $.makeArray(arguments);
                new DataFlow(args[0], context)
                    .detachFromQueue()
                    .asyncOperation(
                        function() { callback.apply(this, args); },
                        function() {
                            // Async ops can use undefined result to skip resolving.
                            // This is handy, when there are multiple identical results
                            // to be retrieved and they have not been filtered beforehand
                            if(this.data !== undefined) { results[args[1]] = this.getData(); }
                            if(--num_items <= 0) {
                                context.setData( results );
                                queue.next();
                            }
                        });
            }, context);

            if(_.values(context.data).length > 0) {
                context.wait();
                _.map(context.data, singleOp);
                return false;
            }
        });

        return this;
    };
    DataFlow.prototype.asyncEach = function(callback) {
        var context = this;
        this._then(function() {
            var queue = context._queue;
            var num_items = context.data.length;
            var singleOp = _.bind(function() {
                var args = $.makeArray(arguments);
                new DataFlow(args[0], context).detachFromQueue().asyncOperation(
                    function() { callback.apply(this, args); },
                    function() {
                        if(--num_items <= 0) {
                            queue.next();
                        }
                    });
            }, context);
            
            context.wait();
            _.each(context.data, singleOp);
            return false;
        });

        return this;
    };
    DataFlow.prototype.asyncMapEach = function(callback) {
        this.asyncEach(function(value, key, array) {
            var context = this;
            new DataFlow(value, context)
                .detachFromQueue()
                .asyncMap(callback)
                ._then(function() {
                    array[key] = this.data;
                    context.next();
                });
        });
        return this;
    };
    DataFlow.prototype.map = function(callback) {
        var context = this;
        this._then(function() {
            context.setData(
                _.map(context.data, _.bind(callback, context)));
        });
        return this;
    };
    DataFlow.prototype.each = function(callback) {
        var context = this;
        this._then(function() {
            _.each(context.data, _.bind(callback, context));
        });
        return this;
    };
    DataFlow.prototype.mapEach = function(callback) {
        var context = this;
        this.each(function(item, key, array) {
            if($.isArray(item)) {
                array[key] = _.map(item, _.bind(callback, context));
            } else {
                array[key] = _.bind(callback, context)(item);
            }
        });
        return this;
    };
    DataFlow.prototype.select = function(callback) {
        var context = this;
        this._then(function() {
            context.setData(
                _.select(context.data, _.bind(callback, context))
            );
        });
        return this;
    };
    DataFlow.prototype.bipartite = function(callback) {
        var context = this;
        this._then(function() {
            context.setData(
                _.bipartite(context.data, _.bind(callback, context))
            );
        });
        return this;
    };
    DataFlow.prototype.sortBy = function(callback) {
        var context = this;
        this._then(function() {
            context.setData(
                _.sortBy(context.data, _.bind(callback, context))
            );
        });
        return this;
    };
    DataFlow.prototype.print = function() {
        this._then(function() {
            console.log(JSON.stringify(this.data));
        });
        return this;
    };
    DataFlow.prototype.isIterable = function() {
        var type = typeof(this.data);
        return !$.isPlainObject(this.data) ||
                _.any(['number', 'string', 'boolean'], 
                    function(t) { return type === t; });
    };
    DataFlow.prototype.extend = function(obj_or_callback) {
        var context = this;
        this._then(function() {
            $.extend( context.data, 
                _.isFunction(obj_or_callback) ? 
                obj_or_callback.call(context) : obj_or_callback);
        });
        return this;
    };
    DataFlow.prototype.setData = function(data) {
        this.data = _.isArray(data) ? data : [ data ];
    };
    DataFlow.prototype.getData = function() {
        return this.data.length === 1 ? this.data[0] : this.data;
    };
    DataFlow.prototype.pluck = function(key, allow_empty) {
        var plucked = new DataFlow(undefined, this, key);
        var context = this;
        plucked._then(function() {
            plucked.data = _.pluckNested(context.data, key, allow_empty);
        });
        return plucked;
    };
    DataFlow.prototype.keys = function() {
        var context = this;
        this.map(function(value, key) {
            return key;
        });
        return this;
    };
    DataFlow.prototype.values = function() {
        var context = this;
        this.map(function(value) {
            return _.values(value);
        });
        return this;
    };
    DataFlow.prototype.first = function() {
        var context = this;
        this._then(function() {
            context.data = context.getData();
        });
        return this;
    };
    DataFlow.prototype.flatten = function(just_get_data) {
        var context = this;
        this._then(function() {
            context.data = _.flatten(context.data);
        });
        return this;
    };
    DataFlow.prototype.uniq = function() {
        var context = this;
        this._then(function() {
            context.data = _.uniq(context.data);
        });
        return this;
    };
    DataFlow.prototype.reverse = function() {
        var context = this;
        this._then(function() {
            if($.isArray(context.data)) {
                context.data.reverse();
            } else {
                throw "Cannot reverse. Data is not an array.";
            }
        });
        return this;
    };
    DataFlow.prototype.end = function(key, parent) {
        var context = this;
        this._then(function() {
            var p = $.isFunction(parent) ? 
                    parent.call(context) : 
                    (typeof(parent) === 'boolean' ? 
                        parent : 
                        parent === undefined) && context.parent;

            if(p) {
                var target = key || context._key;
                if(p.hasOwnProperty(target)) {
                    p[target] = $.extend(p[target], context.data);
                } else {
                    p[target] = context.data;
                }
            }
        });
        return this.parent;
    };
    DataFlow.prototype.getJSON = function(url, key) {
        this.asyncOperation(function() {
            var context = this;
            var queue = this._queue;
            $.getJSON(url)
                .then(function(response) {
                    context.data = 
                        key ? response.result[key] : response.result;
                    queue.next();
                });
            });
        return this;
    };
})(taiste);
