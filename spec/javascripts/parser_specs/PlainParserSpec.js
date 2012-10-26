describe("Nagger.Parser.Plain", function(){

  var klass = com.jivatechnology.Nagger.Parser.Plain;

  describe("#parse",function(){

    var subject;

    beforeEach(function(){
      subject = new klass();
    });

    it("should return an empty string when nothing passed in", function(){
      expect(subject.parse()).toEqual("");
    });

    it("should return the string unmodified when a string is passed in", function(){
      expect(subject.parse("plain ole payload")).toEqual("plain ole payload");
    });

  });

});
