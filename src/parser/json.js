if (!com.jivatechnology.Nagger.Parser) { com.jivatechnology.Nagger.Parser = {}; }

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

}).call(com.jivatechnology.Nagger.Parser);
