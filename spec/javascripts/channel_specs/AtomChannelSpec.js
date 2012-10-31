/*jshint multistr:true */

describe("Nagger.Channel.Atom", function(){

  var subject;
  var klass = com.jivatechnology.Nagger.Channel.Atom;

  afterEach(function(){
    if(subject){
      $(subject.subscriptions()).each(function(i,s){
        subject.unsubscribe(s);
      });
    }
  });

  describe("initialisation", function(){

    it("should accept a configuration object", function(){
      var parser  = {};
      var delay   = 2000;

      var subject = new klass({'parser': parser, 'delay': delay});
      expect(subject.parser()).toEqual(parser);
      expect(subject.delay()).toEqual(delay);
    });

  });

  describe("event", function(){

    var parser;
    var entry;
    var feed;

    beforeEach(function(){
      parser  = {parse: function(s){return s;}};
      subject = new klass({parser: parser});

      entry = '\
        <id>1</id>\
        <title>Item 1</title>\
        <author><name>John Does</name></author>\
        <updated>2012-09-30T11:10:00Z</updated>\
        <summary>Some data</summary>';

      feed = '\
        <?xml version="1.0" encoding="utf-8"?>\
        <feed xmlns="http://www.w3.org/2005/Atom">\
          <title>Some Node</title>\
          <link href="http://test.host"/>\
          <updated>2012-09-30T11:19:01Z</updated>\
          <author><name>John Doe</name></author>\
          <id>test.host,some_node</id>\
          <entry>' + entry + '</entry>\
        </feed>';

      Mooch.stub_request('GET', 'some_node').returns({ body: feed });
    });

    describe("the feed adds items", function(){

      it("should pass the item to the parser", function(){
        var passedin;

        runs(function(){

          parser.parse = function(s){ passedin = s; };

          subject.subscribe("some_node");
        });

        waitsFor(function(){
          return passedin;
        });

        runs(function(){
          expect( passedin ).toEqual( entry );
        });

      });

      it("should trigger onMessage callbacks with the parsed item", function(){
        var sent_id;
        var sent_verb;
        var sent_body;

        runs(function(){
          parser.parse = function(s){ return "output"; };

          subject.subscribe("some_node");

          subject.onMessage.add(function(id,verb,payload){
            sent_id      = id;
            sent_verb    = verb;
            sent_payload = payload;
          });
        });

        waitsFor(function(){
          return sent_id;
        });

        runs(function(){
          expect( sent_id      ).toEqual('1');
          expect( sent_verb    ).toEqual('update');
          expect( sent_payload ).toEqual('output');
        });

      });

    });

    describe("the feed removes items", function(){
      it("should trigger onMessage callbacks", function(){

        var node_added;
        var sent_id;
        var sent_verb;

        runs(function(){
          subject.subscribe("some_node");
          subject.onMessage.add(function(){
            node_added = true;
          });
        });

        waitsFor(function(){
          return node_added;
        });

        runs(function(){
          subject.onMessage.clear();
          subject.onMessage.add(function(id,verb){
            sent_id   = id;
            sent_verb = verb;
          });

          feed = '\
            <?xml version="1.0" encoding="utf-8"?>\
            <feed xmlns="http://www.w3.org/2005/Atom">\
              <title>Some Node</title>\
              <link href="http://test.host"/>\
              <updated>2012-09-30T13:39:43Z</updated>\
              <author><name>John Doe</name></author>\
              <id>test.host,some_node</id>\
            </feed>';

          Mooch.stub_request('GET', 'some_node').returns({ body: feed });
        });

        waitsFor(function(){
          return sent_id;
        });

        runs(function(){
          expect( sent_id ).toEqual("1");
          expect( sent_verb ).toEqual("remove");
        });

      });
    });

  });

  describe("#subscriptions", function(){

    var feed;

    beforeEach(function(){
      parser  = {parse: function(s){return s;}};
      subject = new klass({parser: parser});

      feed = '\
        <?xml version="1.0" encoding="utf-8"?>\
        <feed xmlns="http://www.w3.org/2005/Atom">\
          <title>Some Node</title>\
          <link href="http://test.host"/>\
          <updated>2012-09-30T11:19:01Z</updated>\
          <author><name>John Doe</name></author>\
          <id>test.host,some_node</id>\
        </feed>';
    });

    it("should return successful subscriptions", function(){
      runs(function(){
        Mooch.stub_request('GET', 'node_1').returns({ body: feed });
        Mooch.stub_request('GET', 'node_2').returns({ body: feed });
        Mooch.stub_request('GET', 'node_3').returns({ body: feed });

        subject.subscribe("node_1");
        subject.subscribe("node_2");
        subject.subscribe("node_3");
      });

      waitsFor(function(){
        return subject.subscriptions().length == 3;
      });

      runs(function(){
        expect(subject.subscriptions()).toEqual(["node_1","node_2","node_3"]);
      });
    });

    it("should not include unsuccessful subscriptions", function(){
      var count = 0;

      runs(function(){
        Mooch.stub_request('GET', 'node_1').returns({ body: feed });
        Mooch.stub_request('GET', 'node_2').returns({ body: feed });
        Mooch.stub_request('GET', 'node_3').returns({ status: 500 });

        subject.subscribe("node_1");
        subject.subscribe("node_2");
        subject.subscribe("node_3");

        var test = function(){
          count += 1;
        };

        subject.onSubscribeSuccess.add(test);
        subject.onSubscribeFailure.add(test);
      });

      waitsFor(function(){
        return count == 3;
      });

      runs(function(){
        expect(subject.subscriptions()).toEqual(["node_1","node_2"]);
      });
    });

  });

  describe("#subscribe", function(){
    beforeEach(function(){
      parser  = {parse: function(s){return s;}};
      subject = new klass({parser: parser});
    });

    it("should trigger callback if successful", function(){
      var called = false;

      runs(function(){
        Mooch.stub_request('GET', 'some/node').returns({ status: 200 });

        subject.onSubscribeSuccess.add(function(){
          called = true;
        });

        subject.subscribe("some/node");
      });

      waitsFor(function(){
        return called;
      });

      runs(function(){
        expect(called).toEqual(true);
      });
    });

    it("should trigger callback if unsuccessful", function(){
      var called = false;

      runs(function(){
        Mooch.stub_request('GET', 'some/node').returns({ status: 500 });

        // Create subscription
        subject.subscribe("some/node");

        subject.onSubscribeFailure.add(function(){
          called = true;
        });
      });

      waitsFor(function(){
        return called;
      });

      runs(function(){
        expect(called).toEqual(true);
      });
    });
  });

  describe("#unsubscribe", function(){

    beforeEach(function(){
      parser  = {parse: function(s){return s;}};
      subject = new klass({parser: parser});

      runs(function(){
        var feed = '\
          <?xml version="1.0" encoding="utf-8"?>\
          <feed xmlns="http://www.w3.org/2005/Atom">\
            <title>Some Node</title>\
            <link href="http://test.host"/>\
            <updated>2012-09-30T11:19:01Z</updated>\
            <author><name>John Doe</name></author>\
            <id>test.host,some_node</id>\
          </feed>';

        Mooch.stub_request('GET', 'some/node').returns({ body: feed });

        subject.subscribe("some/node");
      });

      waitsFor(function(){
        return subject.subscriptions().length == 1;
      });
    });

    it("should trigger callback if successful", function(){

      var called = false;

      runs(function(){
        subject.onUnsubscribeSuccess.add(function(){
          called = true;
        });

        subject.unsubscribe("some/node");
      });

      waitsFor(function(){
        return called;
      });

      runs(function(){
        expect(called).toEqual(true);
      });
    });

  });

});
