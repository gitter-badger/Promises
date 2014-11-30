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

            isPromiseLike = function(obj) {
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

                    if (isPromiseLike(value)) {

                        toPromise(value).then(interimOnFulfilled, interimOnRejected);

                    } else {
                        onFulfilled(value);
                    }
                }

                function interimOnRejected(reason) {

                    if (isPromiseLike(reason)) {

                        toPromise(reason).then(interimOnFulfilled, interimOnRejected);

                    } else {

                        onRejected(reason);
                    }
                }

                toPromise(thenable).then(interimOnFulfilled, interimOnRejected);
            },

            Promise = function(resolver) {
                this.fulfilled = false;
                this.rejected = false;
                this.value = undefined;
                this.reason = undefined;
                this.state = undefined;
                this.subscribers = [];
                this.onFulfilled = [];
                this.onRejected = [];

                // Make sure this is not an empty function

                if (noop !== resolver) {
                    this.resolve(resolver);
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


        Promise.resolve = function(value) {
            if (isPromiseLike(value)) {
                return toPromise(value);
            }
            return new Promise(function(resolve) {
                resolve(value);
            });
        };

        Promise.reject = function(reason) {
            return new Promise(function(resolve, reject) {
                reject(reason);
            });
        };

        Promise.race = function(values) {
            return new Promise(function(resolve, reject) {

                if (!isArray(values)) {
                    reject(new TypeError('You must pass an array to race.'));
                } else {
                    var value,
                        length = values.length,
                        i = 0;
                    while (i < length) {
                        value = values[i];

                        if (isPromiseLike(value)) {
                            dive(value, resolve, reject);
                        } else {
                            resolve(value);
                        }
                        i++;
                    }
                }
            });
        };

        Promise.all = function(values) {
            return new Promise(function(resolve, reject) {
                var thenables = 0,
                    fulfilled = 0,
                    value,
                    length = values.length,
                    i = 0;
                values = values.slice(0);
                while (i < length) {
                    value = values[i];
                    if (isPromiseLike(value)) {
                        thenables++;
                        dive(
                            value,
                            function(index) {
                                return function(value) {
                                    values[index] = value;
                                    fulfilled++;
                                    if (fulfilled == thenables) {
                                        resolve(values);
                                    }
                                };
                            }(i),
                            reject
                        );
                    } else {
                        //[1, , 3] → [1, undefined, 3]
                        values[i] = value;
                    }
                    i++;
                }
                if (!thenables) {
                    resolve(values);
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

                return new Promise(function(resolve, reject) {

                    function asyncOnFulfilled() {
                        window.setImmediate(function() {
                            var value;
                            try {
                                value = onFulfilled(promise.value);
                            } catch (error) {
                                reject(error);
                                return;
                            }
                            if (isPromiseLike(value)) {
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
                            if (isPromiseLike(reason)) {
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

            'catch': function(onRejected) {
                return this.then(null, onRejected);
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