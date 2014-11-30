// ECMA-6 Promises polyfill
(function(global) {

    'use strict';


    // *Only* use this polyfill if not native supported by browser

    if (!'Promise' in global &&
        !'resolve' in global.Promise &&
        !'reject' in global.Promise &&
        !'all' in global.Promise &&
        !'race' in global.Promise &&
        (function() {
            var resolve;
            new window.Promise(function(r) {
                resolve = r;
            });
            return typeof resolve !== 'function';
        }())) {

        // *Only* use this polyfill if not native supported by browser

        var
            isArray = Array.isArray,

            noop = function() {

            },
            isCallable = function(x) {
                return typeof x === 'function' &&
                    Object.prototype.toString.call(x) === '[object Function]';
            },

            IsPromise = function(obj) {
                if (obj == null && typeof obj !== 'object') {
                    return false;
                }

                return obj instanceof Promise;
            },

            isThenable = function(obj) {
                return obj && typeof obj.then === 'function';
            },

            isSettled = function(promise) {
                return promise.fulfilled || promise.rejected;
            },

            call = function(callback) {
                callback();
            },

            dive = function(thenable, onFulfilled, onRejected) {

                function interimOnFulfilled(value) {

                    if (isThenable(value)) {

                        toPromise(value).then(interimOnFulfilled, interimOnRejected);

                    } else {
                        onFulfilled(value);
                    }
                }

                function interimOnRejected(reason) {

                    if (isThenable(reason)) {

                        toPromise(reason).then(interimOnFulfilled, interimOnRejected);

                    } else {

                        onRejected(reason);
                    }
                }

                toPromise(thenable).then(interimOnFulfilled, interimOnRejected);
            },

            // 25.4.3.1 Promise(executor)

            Promise = function(executor) {

                this.fulfilled = false;
                this.rejected = false;
                this.value = undefined;
                this.reason = undefined;
                this.msg = undefined;
                this.state = 0;
                this.done = false;
                this.chain = [];
                this.subscribers = [];
                this.onFulfilled = [];
                this.onRejected = [];

                // Make sure this is not an empty function

                if (noop !== executor) {
                    this.resolve(executor);
                }
            },

            toPromise = function(thenable) {
                if (IsPromise(thenable)) {
                    return thenable;
                }
                return new Promise(function(resolve, reject) {
                    window.setImmediate(function() {
                        try {
                            thenable.then(resolve, reject);
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
            };

        // 25.4.4.6 Promise.resolve(x)
        Promise.resolve = function(x) {
            if (isThenable(x)) {
                return toPromise(x);
            }
            return new Promise(function(resolve) {
                resolve(x);
            });
        };
        // 25.4.4.5 Promise.reject(r)
        Promise.reject = function(r) {
            return new Promise(function(resolve, reject) {
                reject(r);
            });
        };
        // 25.4.4.4 Promise.race(iterable)
        Promise.race = function(iterable) {
            return new Promise(function(resolve, reject) {

                if (!isArray(iterable)) {
                    reject(new TypeError('You must pass an array to race.'));
                } else {
                    var value,
                        length = iterable.length,
                        i = 0;
                    while (i < length) {
                        value = iterable[i];

                        if (isThenable(value)) {
                            dive(value, resolve, reject);
                        } else {
                            resolve(value);
                        }
                        i++;
                    }
                }
            });
        };
        // 25.4.5.1 Promise.prototype.catch(onRejected)
        Promise.all = function(onRejected) {
            return new Promise(function(resolve, reject) {
                var thenables = 0,
                    fulfilled = 0,
                    value,
                    length = onRejected.length,
                    i = 0;
                values = onRejected.slice(0);
                while (i < length) {
                    value = onRejected[i];
                    if (isThenable(value)) {
                        thenables++;
                        dive(
                            value,
                            function(index) {
                                return function(value) {
                                    onRejected[index] = value;
                                    fulfilled++;
                                    if (fulfilled == thenables) {
                                        resolve(onRejected);
                                    }
                                };
                            }(i),
                            reject
                        );
                    } else {
                        //[1, , 3] → [1, undefined, 3]
                        onRejected[i] = value;
                    }
                    i++;
                }
                if (!thenables) {
                    resolve(onRejected);
                }
            });
        };

        Promise.prototype = {

            constructor: Promise,

            resolve: function(resolver) {

                var promise = this,
                    resolve = function(value) {
                        promise.fulfill(value);
                    },
                    reject = function(reason) {
                        promise.reject(reason);
                    };

                try {
                    resolver(resolve, reject);
                } catch (error) {
                    if (!isSettled(promise)) {
                        reject(error);
                    }
                }
            },

            fulfill: function(value) {
                if (!isSettled(this)) {
                    this.fulfilled = true;
                    this.value = value;
                    this.onFulfilled.forEach(call);
                    this.clearQueue();
                }
            },

            reject: function(reason) {
                if (!isSettled(this)) {
                    this.rejected = true;
                    this.reason = reason;
                    this.onRejected.forEach(call);
                    this.clearQueue();
                }
            },

            enqueue: function(onFulfilled, onRejected) {
                this.onFulfilled.push(onFulfilled);
                this.onRejected.push(onRejected);
            },

            clearQueue: function() {
                this.onFulfilled = [];
                this.onRejected = [];
            },

            then: function(onFulfilled, onRejected) {

                // Mehran! Deal with the 'state' here 

                var promise = this,
                    state = promise.state;


                if (!IsPromise(promise)) {
                    throw new TypeError('not a promise');
                }

                if (!isCallable(onRejected)) {
                    onRejected = function(e) {
                        throw e;
                    };
                }

                if (!isCallable(onFulfilled)) {
                    onFulfilled = function(val) {
                        return val;
                    };
                }

                return new this.constructor(function(resolve, reject) {

                    function asyncOnFulfilled() {
                        window.setImmediate(function() {
                            var value;
                            try {
                                value = onFulfilled(promise.value);
                            } catch (error) {
                                reject(error);
                                return;
                            }
                            if (isThenable(value)) {
                                toPromise(value).then(resolve, reject);
                            } else {
                                resolve(value);
                            }
                        });
                    }

                    function asyncOnRejected() {
                        window.setImmediate(function() {
                            var reason;
                            try {
                                reason = onRejected(promise.reason);
                            } catch (error) {
                                reject(error);
                                return;
                            }
                            if (isThenable(reason)) {
                                toPromise(reason).then(resolve, reject);
                            } else {
                                resolve(reason);
                            }
                        });
                    }

                    if (promise.fulfilled) {
                        asyncOnFulfilled();
                    } else if (promise.rejected) {
                        asyncOnRejected();
                    } else {
                        promise.enqueue(asyncOnFulfilled, asyncOnRejected);
                    }
                });
            },

            // 25.4.5.1 Promise.prototype.catch(onRejected)

            'catch': function(onRejected) {
                return this.then(undefined, onRejected);
            }
        };

        if (global.Promise) {
            delete global.Promise.accept;
            delete global.Promise.defer;
            delete global.Promise.prototype.chain;
        }
        global.Promise = Promise;
    }
}(this));