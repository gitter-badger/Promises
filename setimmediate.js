// ECMA-6 - setImmediate polyfill
window.setImmediate || function() {
    'use strict';

    var uid = 0,
        storage = {},
        firstCall = true,
        slice = Array.prototype.slice,
        message = 'setImmediatePolyfillMessage',

        fastApply = function(args) {
            var func = args[0],
                len = args.length;

            if (len === 1) {
                return func();
            }

            if (len === 2) {
                return func(args[1]);
            }

            if (len === 3) {
                return func(args[1], args[2]);
            }
            return func.apply(window, slice.call(args, 1));
        },

        callback = function(event) {
            var key = event.data,
                data;

            // We can't gamble here and think hAzzle are loaded beforehand, and
            // use ECMA-7 contains(), so we are using native indexOf

            if (typeof key === 'string' && 0 == key.indexOf(message)) {
                data = storage[key];
                if (data) {
                    delete storage[key];
                    fastApply(data);
                }
            }
        }
    
    //# EXPOSE TO THE GLOBAL SCOPE
 
    window.setImmediate = function setImmediate() {
        var id = uid++,
            key = message + id;
            
        storage[key] = arguments;
        
        if (firstCall) {
            firstCall = false;
            window.addEventListener('message', callback);
        }
        window.postMessage(key, '*');
        return id;
    };

    window.clearImmediate = function clearImmediate(id) {
        delete storage[message + id];
    };

}();