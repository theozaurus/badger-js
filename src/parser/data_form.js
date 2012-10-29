//= require jquery

// This is a very naive parser, it will not translate all aspects of information
// in a DataForm. See `DataFormParserSpec.js` to see how it works.

if (!com.jivatechnology.Badger.Parser) { com.jivatechnology.Badger.Parser = {}; }

(function(){

  this.DataForm = (function(){

    var VALID_TYPES = ['boolean','hidden','jid-multi','jid-single','list-multi','list-single','text-multi','text-private','text-single'];

    var string_or_null = function(tree,element){
      var r = tree.find(element);
      if(r.length > 0){
        return r.html();
      } else {
        return null;
      }
    };

    var coerce_value = function(type,value){
      if(type == "boolean"){
        // Booleans must be 1 or true. It defaults to false
        return new RegExp("/^(1)|(true)$/").test(value);
      } else {
        return value;
      }
    };

    var default_value = function(type){
      if(type == "boolean"){
        return false;
      } else {
        return null;
      }
    };

    var field_value = function($field_tree){
      var type = $field_tree.attr("type");
      var is_multi = /\-multi$/.test(type);

      if(is_multi){
        return $field_tree.find("> value").map(function(i,v){
          var $v = $(v);
          return coerce_value(type,$v.html());
        }).toArray();
      } else {
        v = $field_tree.find("> value")[0];
        return coerce_value(type,$(v).html()) || default_value(type);
      }

    };

    var field_name = function($field_tree){
      return $field_tree.attr('var');
    };

    var interesting_field = function($field_tree){
      var type = $field_tree.attr("type");
      return VALID_TYPES.indexOf(type) >= 0;
    };

    var fields = function(tree){
      var result = {};
      tree.find("> field").each(function(i,f){
        var $f = $(f);
        if(interesting_field($f)){
          result[field_name($f)] = field_value($f);
        }
      });
      return result;
    };

    return function(){

      this.parse = function(input){
        var $input = $(input);

        var data_form = {};

        return {
          "title":        string_or_null($input,"title"),
          "instructions": string_or_null($input,"instructions"),
          "fields":       fields($input)
        };

      };

    };

  })();

}).call(com.jivatechnology.Badger.Parser);
