describe("Nagger.Parser.JSON", function(){

  var klass = com.jivatechnology.Nagger.Parser.JSON;

  describe("#parse",function(){

    var subject;

    beforeEach(function(){
      subject = new klass();
    });

    it("should return an empty object when nothing passed in", function(){
      expect(subject.parse()).toEqual({});
    });

    it("should return an object when parsed correctly formated JSON", function(){
      var json = '{"important":true,"message":"remember sys admin day"}';
      var result = {"important": true, "message": "remember sys admin day"};
      expect(subject.parse(json)).toEqual(result);
    });

  });


});
