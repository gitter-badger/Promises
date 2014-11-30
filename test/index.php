<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Animation</title>

</style>

<script type="text/javascript" src="setimmediate.js"></script>
<script type="text/javascript" src="promises.js"></script>

</head>
<body>

<button onClick="testPromise();"> Click for testing!</button> 

<div id="log"></div>

<script type="text/javascript">

    

var promiseCount = 0;
function testPromise() {
  var thisPromiseCount = ++promiseCount;

  var log = document.getElementById('log');
  log.insertAdjacentHTML('beforeend', thisPromiseCount + 
      ') Started (<small>Sync code started</small>)<br/>');

  // We make a new promise: we promise the string 'result' (after waiting 3s)
  var p1 = new Promise(
    // The resolver function is called with the ability to resolve or 
    // reject the promise
    function(resolve, reject) {       
      log.insertAdjacentHTML('beforeend', thisPromiseCount + 
          ') Promise started (<small>Async code started</small>)<br/>');
      // This only is an example to create asynchronism
      window.setTimeout(
        function() {
          // We fulfill the promise !
          resolve(thisPromiseCount)
        }, Math.random() * 2000 + 1000);
    });

  // We define what to do when the promise is fulfilled
  p1.then(
    // Just log the message and a value
    function(val) {
      log.insertAdjacentHTML('beforeend', val +
          ') Promise fulfilled (<small>Async code terminated</small>)<br/>');
    });

  log.insertAdjacentHTML('beforeend', thisPromiseCount + 
      ') Promise made (<small>Sync code terminated</small>)<br/>');
}
</script>



