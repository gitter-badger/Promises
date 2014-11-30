// ECMA-6 - setImmediate polyfill
// Note! This polyfill are for hAzzleJS, and only #IE9+ are supported
// Node.js 0.9+ & IE10+ has setImmediate
typeof window.setImmediate === 'function' &&
    typeof window.clearImmediate === 'function' ||
    (function(global, undefined) {

        'use strict';

        var counter = 1, // Spec says greater than zero
            queue = {},
            currentlyRunningATask = false,
            slice = Array.prototype.slice,
            MessageChannel   = global.MessageChannel,
            setImmediate;

        function defer(args) {
            queue[counter] = partiallyApplied.apply(undefined, args);
            return counter++;
        }

        // This function accepts the same arguments as setImmediate, but
        // returns a function that requires no arguments.
        function partiallyApplied(handler) {
            var args = slice.call(arguments, 1);
            return function() {
                if (typeof handler === 'function') {
                    handler.apply(undefined, args);
                } else {
                    (new Function('' + handler))();
                }
            };
        }

        function run(handle) {
            if (currentlyRunningATask) {
                setTimeout(partiallyApplied(run, handle), 0);
            } else {
                var task = queue[handle];
                if (task) {
                    currentlyRunningATask = true;
                    try {
                        task();
                    } finally {
                        clearImmediate(handle);
                        currentlyRunningATask = false;
                    }
                }
            }
        }

        function clearImmediate(handle) {
            delete queue[handle];
        }

        // Check if we can use post message

        function canUsePostMessage() {

            var postMessage = global.postMessage,
                importScripts = global.importScripts,
                postMessageIsAsynchronous,
                oldOnMessage;

            // Modern browsers, skip implementation for WebWorkers
            // IE8 has postMessage, but it's sync & typeof its postMessage is object

            if (postMessage && !importScripts) {

                postMessageIsAsynchronous = true;

                oldOnMessage = global.onmessage;

                global.onmessage = function() {
                    postMessageIsAsynchronous = false;
                };

                global.postMessage('', '*');
                global.onmessage = oldOnMessage;
                return postMessageIsAsynchronous;
            }
        }

        // If we can use post message, go on...

        if (canUsePostMessage()) {
            // Non-IE10+ browsers
            var messagePrefix = 'setImmediate$' + Math.random() + '$';

            global.addEventListener('message', function(event) {

                if (event.source === global &&
                    typeof event.data === 'string' &&
                    event.data.indexOf(messagePrefix) === 0) {
                    run(+event.data.slice(messagePrefix.length));
                }
            }, false);

            setImmediate = function() {
                var handle = defer(arguments);
                global.postMessage(messagePrefix + handle, '*');
                return handle;
            };

            // Web workers

        } else if (MessageChannel) {

            var channel = new MessageChannel();

            channel.port1.onmessage = function(event) {
                var handle = event.data;
                run(handle);
            };

            setImmediate = function() {
                var handle = defer(arguments);
                channel.port2.postMessage(handle);
                return handle;
            };
        }
        // EXPOSE
        window.setImmediate = setImmediate;
        window.clearImmediate = clearImmediate;
    }(this));