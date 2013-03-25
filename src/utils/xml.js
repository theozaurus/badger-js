//= require jquery

if (!com.jivatechnology.Badger.Utils) { com.jivatechnology.Badger.Utils = {}; }

(function(){

  this.XML = {
    stringToXML: jQuery.parseXML,
    stringToXMLElement: function(string){ return this.stringToXML(string).documentElement; },
    XMLToString: function(xmlData){
      try {
        // Standard
        return (new XMLSerializer()).serializeToString(xmlData);
      } catch (e) {
        // IE
        return xmlData.xml;
      }
      return false;
    },
    XMLContentsToString: function(xmlData){
      try {
        var s = xmlData.textContent || xmlData.innerText || xmlData.nodeValue || '';
        return s;
      } catch (e) {
        return false;
      }
    }
  };

}).call(com.jivatechnology.Badger.Utils);
