/** ECMA-6 Promises polyfill
 *
 * http://people.mozilla.org/~jorendorff/es6-draft.html
 *
 * TODO:
 * ======
 *
 * jsHint are complaining as a PIG!!  Fix it!!
 *
 */
(function(global) {

    'use strict';

    // Chrome's native Promise has extra methods that it shouldn't have. Let's remove them.
    if (global.Promise) {
        delete global.Promise.accept;
        delete global.Promise.defer;
        delete global.Promise.prototype.chain;
    }

    // don't trample native promises if they exist
    if ('Promise' in global && typeof global.Promise.all === 'function') {
        return;
    }

    var $iterator$, ArrayIteratorPrototype,
        Symbol = global.Symbol || {};

    // set a value as non-configurable and non-enumerable
    function defineInternal(obj, key, val) {
        Object.defineProperty(obj, key, {
            configurable: false,
            enumerable: false,
            writable: true,
            value: val
        });
    }

    // 6 ECMAScript Data Types and Values
    function isType(x) {
        var tof = typeof x;
        if (tof === 'undefined' ||
            tof === 'boolean' ||
            tof === 'string' ||
            tof === 'undefined' ||
            tof === 'number') {
            return tof;
        }
        if (x === null) {
            return 'null';
        }
        /*jshint notypeof: true */
        if (typeof Symbol === 'function' && x instanceof Symbol) {
            return 'symbol';
        }
        /*jshint notypeof: false */
        return 'object';
    }

    // 6.1.5.1 Well-Known Symbols (iterator key)
    $iterator$ = typeof Symbol !== 'undefined' && Symbol.iterator ||
        '_es6-shim iterator_';

    // Firefox ships a partial implementation using the name @@iterator.
    // https://bugzilla.mozilla.org/show_bug.cgi?id=907077#c14
    // So use that name if we detect it.

    if (global.Set && typeof new global.Set()['@@iterator'] === 'function') {
        $iterator$ = '@@iterator';
    }

    // 7.1.12 ToString
    function ToString(str) {
        return typeof str === 'string' ? str : String(str);
    }

    // 7.1.13 ToObject
    function ToObject(x, optMessage) {
        /* jshint eqnull:true */
        if (x === null || x === undefined) {
            throw TypeError(optMessage || 'Cannot call method on ' + x);
        }
        return Object(x);
    }

    // 7.1.4 ToInteger
    function ToInteger(value) {
        var number = +value;
        if (number !== number) {
            return 0;
        }
        if (number === 0 || number === Infinity || number === -Infinity) {
            return number;
        }
        return (number >= 0 ? 1 : -1) * Math.floor(Math.abs(number));
    }

    // 7.1.15 ToLength
    function ToLength(v) {
        var len = ToInteger(v);
        if (len <= 0) {
            return 0;
        }
        return Math.min(len, 0x20000000000000 - 1); // 2^53-1
    }

    // 7.2.2 IsCallable
    // http://people.mozilla.org/~jorendorff/es6-draft.html#sec-iscallable

    function IsCallable(x) {
        return typeof x === 'function' //&& // some versions of IE say that typeof /abc/ === 'function'
            //            Object.prototype.tostring.call(x) === '[object Function]';
    }

    // 7.2.3 SameValue( a, b )
    function SameValue(a, b) {

        if (typeof a !== typeof b) {
            return false;
        }
        if (isType(a) === 'undefined') {
            return true;
        }
        if (isType(a) === 'number') {
            if (a !== a && b !== b) {
                return true;
            }
            // 0 === -0, but they are not identical.
            if (a === 0) {
                return 1 / a === 1 / b;
            }
        }
        return a === b;
    }


    // 7.2.5 IsConstructor
    function IsConstructor(obj) {
        return typeof obj === 'function';
    }

    // 7.4.1 GetIterator ( obj )
    // http://people.mozilla.org/~jorendorff/es6-draft.html#sec-getiterator
    function GetIterator(obj) {
        if (isType(obj) !== 'object') {
            throw new TypeError('not a object');
        }
        return obj[$iterator$]();
    }

    // 7.4.2 IteratorNext ( iterator, value )
    function IteratorNext(iterator, value) {
        var result = iterator.next(value);
        if (isType(result) !== 'object') {
            throw new TypeError('not a object');
        }
        return result;
    }

    // 7.4.3 IteratorComplete ( iterResult )
    function IteratorComplete(iterResult) {
        if (isType(iterResult) !== 'object') {
            throw new TypeError('not a object');
        }
        return Boolean(iterResult.done);
    }

    // 7.4.4 IteratorValue ( iterResult )
    function IteratorValue(iterResult) {
        if (isType(iterResult) !== 'object') {
            throw new TypeError('not a object');
        }
        return iterResult.value;
    }

    // 7.4.5 IteratorStep ( iterator )
    function IteratorStep(iterator) {
        var result = IteratorNext(iterator);
        return IteratorComplete(result) === true ? false : result;
    }

    // 7.4.6 CreateIterResultObject ( value, done )
    function CreateIterResultObject(value, done) {
        if (isType(done) !== 'boolean') {
            throw new TypeError('not a boolean value');
        }
        return {
            value: value,
            done: done
        };
    }

    // 8.4.1 EnqueueTask ( queueName, task, arguments)
    function EnqueueTask(task, args) {

        // Should include setImmediate.js polyfill to gain
        // better performance

        if (typeof window.setImmediate === 'function') {
            window.setImmediate(function() {
                task.apply(null, args);
            });
        } else {
            setTimeout(function() {
                task.apply(null, args);
            }, 0);
        }
    }

    // 22.1.5.1 CreateArrayIterator Abstract Operation
    function CreateArrayIterator(array, kind) {
        var O = ToObject(array),
            iterator = Object.create(ArrayIteratorPrototype);
        defineInternal(iterator, '[[IteratedObject]]', O);
        defineInternal(iterator, '[[ArrayIteratorNextIndex]]', 0);
        defineInternal(iterator, '[[ArrayIteratorKind]]', kind);
        return iterator;
    }

    // 22.1.3.29 Array.prototype.values ( )
    Array.prototype.values = function() {
        var O = ToObject(this);
        return CreateArrayIterator(O, 'value');
    };

    // 22.1.3.30 Array.prototype [ @@iterator ] ( )
    Array.prototype[$iterator$] = Array.prototype.values;

    // 22.1.5.2 The %ArrayIteratorPrototype% Object
    ArrayIteratorPrototype = {};

    // 22.1.5.2.1 %ArrayIteratorPrototype%. next()
    ArrayIteratorPrototype.next = function() {
        var O = this,
            a, index, itemKind, lenValue, len,
            elementKey, elementValue, result;
        if (isType(O) !== 'object') {
            throw new TypeError('not a object');
        }
        a = O['[[IteratedObject]]'];
        if (isType(a) === 'undefined') {
            return CreateIterResultObject(undefined, true);
        }
        index = O['[[ArrayIteratorNextIndex]]'];
        itemKind = O['[[ArrayIteratorKind]]'];
        lenValue = a.length;
        len = ToLength(lenValue);
        if (index >= len) {
            defineInternal(O, '[[IteratedObject]]', undefined);
            return CreateIterResultObject(undefined, true);
        }
        defineInternal(O, '[[ArrayIteratorNextIndex]]', index + 1);
        if (itemKind.indexOf('value') !== -1) {
            elementKey = ToString(index);
            elementValue = a[elementKey];
        }
        if (itemKind.indexOf('key+value') !== -1) {
            result = [index, elementValue];
            return CreateIterResultObject(result, false);
        } else if (itemKind.indexOf('key') !== -1) {
            return CreateIterResultObject(index, false);
        }
        if (itemKind.indexOf('value') === -1) {
            throw new TypeError('invalid value');
        }
        return CreateIterResultObject(elementValue, false);

    };

    // 22.1.5.2.2 %ArrayIteratorPrototype% [ @@iterator ] ( )
    ArrayIteratorPrototype[$iterator$] = function() {
        return this;
    };


    // 25.4.1.1.1 IfAbruptRejectPromise (value, capability)
    function IfAbruptRejectPromise(value, capability) {
        try {
            capability['[[Reject]]'].call(undefined, [value]);
        } catch (e) {
            return e;
        }
        return capability;
    }

    // 25.4.1.3 CreateRejectFunction ( promise )
    function CreateRejectFunction(promise) {
        var reject = new PromiseReject();
        defineInternal(reject, '[[Promise]]', promise);
        return reject;
    }

    // 25.4.1.3.1 Promise Reject Functions
    function PromiseReject() {
        return function F(reason) {
            var promise = F['[[Promise]]'],
                reactions;
            if (isType(promise) !== 'object') {
                throw new TypeError('not a object');
            }
            if (promise['[[PromiseStatus]]'] !== 'unresolved') {
                return undefined;
            }
            reactions = promise['[[PromiseRejectReactions]]'];
            defineInternal(promise, '[[PromiseResult]]', reason);
            defineInternal(promise, '[[PromiseResolveReactions]]', undefined);
            defineInternal(promise, '[[PromiseRejectReactions]]', undefined);
            defineInternal(promise, '[[PromiseStatus]]', 'has-rejection');
            return TriggerPromiseReactions(reactions, reason);
        };
    }

    // 25.4.1.4 CreateRejectFunction ( promise )
    function CreateResolveFunction(promise) {
        var resolve = new PromiseResolve();
        defineInternal(resolve, '[[Promise]]', promise);
        return resolve;
    }

    // 25.4.1.4.1 Promise Resolve Functions
    function PromiseResolve() {
        return function F(resolution) {
            var promise = F['[[Promise]]'],
                reactions;
            if (isType(promise) !== 'object') {
                throw new TypeError('not a object');
            }
            if (promise['[[PromiseStatus]]'] !== 'unresolved') {
                return undefined;
            }
            reactions = promise['[[PromiseResolveReactions]]'];
            defineInternal(promise, '[[PromiseResult]]', resolution);
            defineInternal(promise, '[[PromiseResolveReactions]]', undefined);
            defineInternal(promise, '[[PromiseRejectReactions]]', undefined);
            defineInternal(promise, '[[PromiseStatus]]', 'has-resolution');
            return TriggerPromiseReactions(reactions, resolution);
        };
    }

    // 25.4.1.5 PromiseCapability  (C)
    // 'PromiseCapability' in the spec is what most promise implementations
    // call a "deferred".
    function PromiseCapability(C) {

        if (!IsCallable(C)) {
            throw new TypeError('bad promise constructor');
        }
        var promise;

        if (!IsConstructor(C)) {
            throw new TypeError('bad promise constructor');
        }
        try {
            promise = Object.create(C.prototype);
        } catch (e) {
            return e;
        }
        return CreatePromiseCapabilityRecord(promise, C);
    }

    // 25.4.1.5.1 CreatePromiseCapabilityRecord( promise, constructor )
    function CreatePromiseCapabilityRecord(promise, constructor) {
        var capability = {},
            executor, constructorResult;
        defineInternal(capability, '[[Promise]]', promise);
        defineInternal(capability, '[[Resolve]]', undefined);
        defineInternal(capability, '[[Reject]]', undefined);
        executor = new GetCapabilitiesExecutor();
        defineInternal(executor, '[[Capability]]', capability);

        try {
            constructorResult = constructor.call(promise, executor);
        } catch (e) {
            return e;
        }

        if (!IsCallable(capability['[[Resolve]]'])) {
            throw new TypeError('not a valid resolver');
        }
        if (!IsCallable(capability['[[Reject]]'])) {
            throw new TypeError('not a valid rejection');
        }
        if (typeof constructorResult === 'object' &&
            !SameValue(promise, constructorResult)) {
            throw new TypeError('not a valid object');
        }
        return capability;
    }

    // 25.4.1.5.2 GetCapabilitiesExecutor Functions
    function GetCapabilitiesExecutor() {
        return function F(resolve, reject) {
            var capability = F['[[Capability]]'];
            if (isType(capability['[[Resolve]]']) !== 'undefined') {
                throw new TypeError();
            }
            if (isType(capability['[[Reject]]']) !== 'undefined') {
                throw new TypeError();
            }
            defineInternal(capability, '[[Resolve]]', resolve);
            defineInternal(capability, '[[Reject]]', reject);
        };
    }

    // 25.4.1.6 IsPromise ( promise )
    function IsPromise(promise) {
        if (isType(promise) !== 'object') {
            return false;
        }

        if (!promise['[[PromiseConstructor]]']) {
            return false;
        }

        if (isType(promise['[[PromiseStatus]]']) === 'undefined') {
            return false; // uninitialized
        }
        return true;
    }

    // 25.4.1.7 TriggerPromiseReactions ( reactions, argument )
    function TriggerPromiseReactions(reactions, x) {
        reactions.forEach(function(reaction) {
            EnqueueTask(PromiseReactionTask, [reaction, x]);
        });
    }

    // 25.4.1.8 UpdatePromiseFromPotentialThenable ( x, capability )
    function UpdatePromiseFromPotentialThenable(x, capability) {
        var then, rejectResult, thenCallResult;
        if (isType(x) !== 'object') {
            return 'not a thenable';
        }

        var resolve = capability['[[Resolve]]'],
            reject = capability['[[Reject]]'];

        try {
            then = x.then; // only one invocation of accessor
        } catch (e) {
            rejectResult = reject.call(undefined, e);
            return null;
        }
        if (!IsCallable(then)) {
            return 'not a thenable';
        }
        try {
            thenCallResult = then.call(x, resolve, reject);
        } catch (e) {
            rejectResult = reject.call(undefined, e);
            return null;
        }
        return null;
    }

    // 25.4.2.1 PromiseReactionTask( reaction, argument )
    function PromiseReactionTask(reaction, argument) {
        var capability = reaction['[[Capabilities]]'],
            handler = reaction['[[Handler]]'],
            handlerResult, selfResolutionError, updateResult;
        try {
            handlerResult = handler.call(undefined, argument);
        } catch (e) {
            return capability['[[Reject]]'].call(undefined, e);
        }
        if (SameValue(handlerResult, capability['[[Promise]]'])) {
            selfResolutionError = new TypeError('Invalid promise');
            return capability['[[Reject]]']
                .call(undefined, selfResolutionError);
        }
        updateResult = UpdatePromiseFromPotentialThenable(handlerResult,
            capability
        );
        if (updateResult === 'not a thenable') {
            return capability['[[Resolve]]'].call(undefined, handlerResult);
        }
        return undefined;
    }

    // 25.4.3.1 Promise ( executor )
    function Promise(executor) {
        var promise = this;
        if (!IsCallable(executor)) {
            throw new TypeError('Invalid executor');
        }
        if (isType(promise) !== 'object') {
            throw new TypeError('Invalid promise');
        }
        if (isType(promise['[[PromiseStatus]]']) !== 'undefined') {
            throw new TypeError('Invalid status');
        }
        defineInternal(this, '[[PromiseConstructor]]', Promise);
        return InitializePromise(promise, executor);
    }

    // 25.4.3.1.1 InitializePromise( promise, executor )
    function InitializePromise(promise, executor) {
        var resolve, reject, completion, status;
        if (isType(promise['[[PromiseStatus]]']) !== 'undefined') {
            throw new TypeError('Invalid status');
        }
        if (!IsCallable(executor)) {
            throw new TypeError('Invalid executor');
        }
        defineInternal(promise, '[[PromiseStatus]]', 'unresolved');
        defineInternal(promise, '[[PromiseResolveReactions]]', []);
        defineInternal(promise, '[[PromiseRejectReactions]]', []);
        resolve = CreateResolveFunction(promise);
        reject = CreateRejectFunction(promise);
        try {
            completion = executor.call(undefined, resolve, reject);
        } catch (e) {
            try {
                status = reject.call(undefined, e);
            } catch (e) {
                return e;
            }
        }

        return promise;
    }

    // 25.4.4.1 Promise.all ( iterable )
    Promise.all = function(iterable) {
        var C = this,
            capability = PromiseCapability(C),
            iterator, values,
            remainingElementsCount, index, next, resolveResult,
            nextValue, nextPromise, resolveElement, result;

        try {
            iterator = GetIterator(iterable);
        } catch (e) {
            return IfAbruptRejectPromise(e, capability);
        }
        values = [];
        remainingElementsCount = {
            '[[value]]': 0
        };
        index = 0;
        try {
            while (true) {

                next = IteratorStep(iterator);
                if (next === false) {
                    if (index === 0) {
                        resolveResult = capability['[[Resolve]]']
                            .call(undefined, values);
                    }
                    return capability['[[Promise]]'];
                }

                nextValue = IteratorValue(next);


                nextPromise = C.cast(nextValue);

                resolveElement = new PromiseAllResolveElementFunction();
                defineInternal(resolveElement, '[[Index]]', index);
                defineInternal(resolveElement, '[[Values]]', values);
                defineInternal(resolveElement, '[[Capabilities]]', capability);
                defineInternal(resolveElement, '[[RemainingElements]]',
                    remainingElementsCount
                );

                result = nextPromise.then(resolveElement,
                    capability['[[Reject]]']
                );

                index++;
                remainingElementsCount['[[value]]'] ++;
            }
        } catch (e) {
            return IfAbruptRejectPromise(e, capability);
        }

    };

    // 25.4.4.1.1 Promise.all Resolve Element Functions
    function PromiseAllResolveElementFunction() {
        return function F(x) {
            var index = F['[[Index]]'],
                values = F['[[Values]]'],
                capability = F['[[Capabilities]]'],
                remainingElementsCount = F['[[RemainingElements]]'];
            try {
                values[index] = x;
            } catch (e) {
                return IfAbruptRejectPromise(e, capability);
            }
            remainingElementsCount['[[value]]'] --;
            if (remainingElementsCount['[[value]]'] === 0) {
                capability['[[Resolve]]'].call(undefined, values);
            }
            return undefined;
        };
    }

    // 25.4.4.2 Promise.cast ( x )
    Promise.cast = function(x) {
        var C = this,
            capability = PromiseCapability(C),
            resolveResult,
            constructor;
        if (IsPromise(x)) {
            constructor = x['[[PromiseConstructor]]'];
            if (SameValue(constructor, C)) {
                return x;
            }
        }

        capability['[[Resolve]]'].call(undefined, x);

        return capability['[[Promise]]'];
    };

    // 25.4.4.4 Promise.race ( iterable )
    Promise.race = function(iterable) {
        var C = this,
            capability = PromiseCapability(C),
            iterator, nextValue, nextPromise, next;

        try {
            iterator = GetIterator(iterable);
        } catch (e) {
            return IfAbruptRejectPromise(e, capability);

        }
        try {
            while (true) {

                next = IteratorStep(iterator);

                if (next === false) {
                    return capability['[[Promise]]'];
                }

                nextValue = IteratorValue(next);

                nextPromise = C.cast(nextValue);

                nextPromise.then(capability['[[Resolve]]'],
                    capability['[[Reject]]']
                );
            }
        } catch (e) {
            return IfAbruptRejectPromise(e, capability);
        }
    };

    // 25.4.4.5 Promise.reject ( r )
    Promise.reject = function(r) {
        var C = this,
            capability = PromiseCapability(C);

        capability['[[Reject]]'].call(undefined, r);

        return capability['[[Promise]]'];
    };

    // 25.4.4.6 Promise.resolve ( v )
    Promise.resolve = function(v) {
        var C = this,
            capability = PromiseCapability(C);

        capability['[[Resolve]]'].call(undefined, v); // call with this===undefined

        return capability['[[Promise]]'];
    };

    // 25.4.5.1 Promise.prototype.catch ( onRejected )
    Promise.prototype['catch'] = function(onRejected) {
        return this.then(undefined, onRejected);
    };

    // 25.4.5.3 Promise.prototype.then ( onFulfilled , onRejected )
    Promise.prototype.then = function(onFulfilled, onRejected) {
        var promise = this;
        if (!IsPromise(promise)) {
            throw new TypeError('not a promise');
        }

        var C = promise.constructor,
            capability = PromiseCapability(C),
            rejectionHandler, fulfillmentHandler,
            resolutionHandler, resolveReaction, rejectReaction, resolution;

        if (IsCallable(onRejected)) {
            rejectionHandler = onRejected;
        } else {
            rejectionHandler = new ThrowerFunction();
        }
        if (IsCallable(onFulfilled)) {
            fulfillmentHandler = onFulfilled;
        } else {
            fulfillmentHandler = new IdentityFunction();
        }
        resolutionHandler = new PromiseResolutionHandlerFunction();
        defineInternal(resolutionHandler, '[[Promise]]', promise);
        defineInternal(resolutionHandler, '[[FulfillmentHandler]]',
            fulfillmentHandler
        );
        defineInternal(resolutionHandler, '[[RejectionHandler]]',
            rejectionHandler
        );
        resolveReaction = {
            '[[Capabilities]]': capability,
            '[[Handler]]': resolutionHandler
        };
        rejectReaction = {
            '[[Capabilities]]': capability,
            '[[Handler]]': rejectionHandler
        };
        if (promise['[[PromiseStatus]]'] === 'unresolved') {
            promise['[[PromiseResolveReactions]]'].push(resolveReaction);
            promise['[[PromiseRejectReactions]]'].push(rejectReaction);
        }
        if (promise['[[PromiseStatus]]'] === 'has-resolution') {
            resolution = promise['[[PromiseResult]]'];
            EnqueueTask(PromiseReactionTask, [resolveReaction, resolution]);
        }
        if (promise['[[PromiseStatus]]'] === 'has-rejection') {
            resolution = promise['[[PromiseResult]]'];
            EnqueueTask(PromiseReactionTask, [rejectReaction, resolution]);
        }
        return capability['[[Promise]]'];
    };

    // 25.4.5.3.1 Identity Functions
    function IdentityFunction() {
        return function F(x) {
            return x;
        };
    }

    // 25.4.5.3.2 PromiseResolutionHandlerFunctions
    function PromiseResolutionHandlerFunction() {
        return function F(x) {
            var promise = F['[[Promise]]'],
                fulfillmentHandler = F['[[FulfillmentHandler]]'],
                rejectionHandler = F['[[RejectionHandler]]'],
                selfResolutionError, C,
                capability,
                updateResult;

            if (SameValue(x, promise)) {
                selfResolutionError = TypeError('Invalid promise');
                return rejectionHandler.call(undefined, selfResolutionError);
            }

            C = promise['[[PromiseConstructor]]'];

            try {
                capability = PromiseCapability(C);
            } catch (e) {
                return e;
            }
            try {
                updateResult = UpdatePromiseFromPotentialThenable(x,
                    capability
                );
            } catch (e) {
                return e;
            }
            if (updateResult !== 'not a thenable') {
                return capability['[[Promise]]'].then(fulfillmentHandler,
                    rejectionHandler
                );
            }
            return fulfillmentHandler.call(undefined, x);
        };
    }

    // 25.4.5.3.3 Thrower Functions
    function ThrowerFunction() {
        return function F(e) {
            throw e;
        };
    }

    // Export

    global.Promise = Promise;

}(this));