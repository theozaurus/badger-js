if (!com.jivatechnology.Nagger.Parser) { com.jivatechnology.Nagger.Parser = {}; }

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

}).call(com.jivatechnology.Nagger.Parser);
