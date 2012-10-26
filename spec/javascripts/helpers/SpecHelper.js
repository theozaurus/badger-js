beforeEach(function() {
  this.addMatchers(EquivalentXml.jasmine);

  this.addMatchers({
    toBeA: function(expected) {
      var type = typeof this.actual;
      return type == expected;
    }
  });
});
