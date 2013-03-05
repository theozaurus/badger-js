describe("Logger",function(){

  var subject = com.jivatechnology.Badger.Logger;

  describe("#error", function(){
    it("should be a function", function(){
      expect( subject.error ).toBeA("function");
      subject.error();
    });
  });

  describe("#warn", function(){
    it("should be a function", function(){
      expect( subject.warn ).toBeA("function");
      subject.warn();
    });
  });

  describe("#log", function(){
    it("should be a function", function(){
      expect( subject.log ).toBeA("function");
      subject.log();
    });
  });

  describe("#info", function(){
    it("should be a function", function(){
      expect( subject.info ).toBeA("function");
      subject.info();
    });
  });

  describe("#debug", function(){
    it("should be a function", function(){
      expect( subject.debug ).toBeA("function");
      subject.debug();
    });
  });

});
