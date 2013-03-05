(function(){

  var scope = this;

  var nativeLogFunctionFor = function(name){
    var ie = typeof window.console != 'undefined' &&
             typeof window.console[name] == "object";

    var normal = typeof window.console != 'undefined' &&
                 typeof window.console[name] == "function";

    var f;

    if( ie ){
      // Smells like IE
      f = Function.prototype.bind.call(console[name],console);
    } else if ( normal ) {
      // Smells like roses
      f = console[name];
    }

    if( f ){
      return function(args){
        return f.apply(console,args);
      };
    }
  };

  var logFunctionFor = function(name){
    var nativeLogFunction = nativeLogFunctionFor(name);
    if(nativeLogFunction){
      return function(){
        // Make arguments play like an array
        var args = Array.prototype.slice.call(arguments,0);
        nativeLogFunction(args);
      };
    } else {
      return function(){};
    }
  };

  this.Logger = {
    error: logFunctionFor('error'),
    warn:  logFunctionFor('warn'),
    log:   logFunctionFor('log'),
    info:  logFunctionFor('info'),
    debug: logFunctionFor('debug')
  };

}).call(com.jivatechnology.Badger);
