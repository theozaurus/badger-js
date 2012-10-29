if (!com.jivatechnology.Badger.Parser) { com.jivatechnology.Badger.Parser = {}; }

(function(){

  this.Plain = (function(){

    return function(){

      this.parse = function(input){
        if(typeof input == 'string'){
          return input;
        } else {
          return "";
        }
      };

    };

  })();

}).call(com.jivatechnology.Badger.Parser);
