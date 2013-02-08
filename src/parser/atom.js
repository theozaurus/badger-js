//= require jquery
//= require ../utils/xml

if (!com.jivatechnology.Badger.Parser) { com.jivatechnology.Badger.Parser = {}; }

(function(){

  var XML = com.jivatechnology.Badger.Utils.XML;

  this.Atom = (function(){

    var stringToDate = function(string){
      // Not compatible in all browsers
      return new Date(Date.parse(string));
    };

    var personRule = {
      required: ["name"],
      optional: ["uri","email"]
    };

    var rules = {
      entry: {
        attributes: ["xml:base", "xml:lang"],
        required:   ["id"],
        optional:   ["content","published","rights","source","summary","title","updated"],
        many:       ["author", "category", "contributor", "link"]
      },
      source: {
        attributes: ["xml:base", "xml:lang"],
        required:   [],
        optional:   ["generator","icon","id","logo","rights","subtitle","title","updated"],
        many:       ["author","category","contributor","link"]
      },
      updated: {
        parser: stringToDate
      },
      published: {
        parser: stringToDate
      },
      link: {
        attributes: ["xml:base","xml:lang","href","rel","type"]
      },
      author: personRule,
      contributor: personRule
    };

    var each = function(array,func){
      for(var i in array){
        if( array.hasOwnProperty(i) ){
          func(array[i]);
        }
      }
    };

    var add = function(data,key,value){
      data[key] = value;
    };

    var addOptional = function(data,key,value){
      var empty = typeof value == "undefined" || value === null || (value instanceof Array && value.length === 0);
      if(!empty){
        add(data,key,value);
      }
    };

    var parseElement = function($input,type){
      var data = {};
      var ruleSet = rules[type] || {};

      if(!(ruleSet.attributes || ruleSet.required || ruleSet.optional || ruleSet.many)){
        var payload = $input[0].textContent;
        if(ruleSet.parser){
          payload = ruleSet.parser(payload);
        }
        return payload;
      }

      // Dig out attributes
      each(ruleSet.attributes, function(attribute){
        addOptional(data,attribute,$input.attr(attribute));
      });

      // Dig out required elements
      each(ruleSet.required, function(element){
        var $e = $input.find(type + " > " + element);
        var parsed = parseElement($e,element);
        add(data,element,parsed);
      });

      // Dig out optional elements
      each(ruleSet.optional, function(element){
        var $e = $input.find(type + " > " + element);
        if($e.length > 0){
          var parsed = parseElement($e,element);
          addOptional(data,element,parsed);
        }
      });

      // Dig out many elements
      each(ruleSet.many, function(element){
        var many = $input.find(type + " > " + element).map(function(i,e){
          var $e = $(e);
          return parseElement($e,element);
        }).toArray();
        addOptional(data,element,many);
      });

      return data;
    };

    return function(){

      this.parse = function(input){
        $e = $(XML.stringToXML(input));

        if( $e.length === 0 ){
          return {};
        } else {
          var result = parseElement($e,"entry");
          return result;
        }

      };

    };

  })();

}).call(com.jivatechnology.Badger.Parser);
