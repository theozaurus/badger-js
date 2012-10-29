if (!com.jivatechnology.Badger.Parser) { com.jivatechnology.Badger.Parser = {}; }

(function(){

  this.JSON = (function(){

    return function(){

      this.parse = function(input){
        try {
          return JSON.parse(input);
        } catch(err) {
          return {};
        }
      };

    };

  })();

}).call(com.jivatechnology.Badger.Parser);
