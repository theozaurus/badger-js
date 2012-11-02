beforeEach(function() {
  this.addMatchers(EquivalentXml.jasmine);

  this.addMatchers({
    toBeA: function(expected) {
      var type = typeof this.actual;
      return type == expected;
    },
    toBeInstanceOf: function(expected){
      return this.actual instanceof expected;
    }
  });
});
