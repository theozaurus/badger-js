/*jshint multistr:true */

describe("Badger.Channel.XMPP", function(){

  var XML = com.jivatechnology.Badger.Utils.XML;

  var klass = com.jivatechnology.Badger.Channel.XMPP;

  var subject;

  var stropheBadgerPlugin;

  var connection_builder = function(){
    // Create an instance of our badger plugin from the badger prototype
    var F = function () {};
    F.prototype = Strophe._connectionPlugins.badger;
    stropheBadgerPlugin = new F();

    var conn = {
      jid:           "foo@test.host/123",
      getUniqueId:   function(){ return "1"; },
      sendIQ:        function(s,success,failure){ success(); },
      addHandler:    function(){},
      deleteHandler: function(){},
      badger:        stropheBadgerPlugin // Add this instance to our connection
    };

    // Simulate the connection going online
    stropheBadgerPlugin.statusChanged(Strophe.Status.ATTACHED);

    return conn;
  };

  describe("initialisation", function(){

    it("should accept a configuration object", function(){
      var xmpp    = connection_builder();
      var pubsub  = "pubsub.test.host";
      var parser  = {};

      var subject = new klass({'connection': xmpp,'pubsub': pubsub, 'parser': parser});
      expect(subject.connection()).toEqual(xmpp);
      expect(subject.pubsub()).toEqual(pubsub);
      expect(subject.parser()).toEqual(parser);
    });

  });

  describe("XMPP connection event", function(){

    beforeEach(function(){
      xmpp    = connection_builder();
      parser  = {parse: function(s){return s;}};
      subject = new klass({'connection': xmpp, 'pubsub': 'pubsub.test.host', 'parser': parser});
    });

    describe("'disconnected'", function(){

      // Not sure how this will operate yet
      it("should trigger onFailure callbacks", function(){
        var failed = false;

        subject.subscribe("node1");
        subject.onSubscribeFailure.add(function(n){ failed = n;});

        expect(failed).toBeFalsy();

        stropheBadgerPlugin.statusChanged(Strophe.Status.DISCONNECTED);

        expect(failed).toEqual("node1");
      });

    });

    describe("'connected'", function(){

      // Not sure how this will operate yet
      it("should resubscribe to all subscriptions", function(){
        subject.subscribe("node1");

        stropheBadgerPlugin.statusChanged(Strophe.Status.DISCONNECTED);

        var success = false;
        subject.onSubscribeSuccess.add(function(n){
          success = n;
        });

        expect(success).toBeFalsy();

        stropheBadgerPlugin.statusChanged(Strophe.Status.ATTACHED);

        expect(success).toEqual("node1");
      });

    });

    describe("'message'", function(){

      var xmpp;
      var parser;
      var message_handler;

      beforeEach(function(){
        xmpp    = connection_builder();
        xmpp.addHandler = function(handler){ message_handler = handler; };

        parser  = {parse: function(s){return s;}};
        subject = new klass({'connection': xmpp, 'pubsub': 'pubsub.test.host', 'parser': parser});
      });

      it("should register the callback onto the XMPP connection when the first subscription is added", function(){
        var opts;
        var registered = 0;

        xmpp.addHandler = function(handler, ns, name, type, id, from, options){
          registered += 1;
          opts = {
            handler: handler,
            ns:      ns,
            name:    name,
            type:    type,
            id:      id,
            from:    from,
            options: options
          };
        };

        subject.subscribe("a node");
        subject.subscribe("a new node");

        expect( opts.handler ).toBeA("function");
        expect( opts.from    ).toEqual("pubsub.test.host");
        expect( opts.name    ).toEqual("message");

        expect( opts.ns      ).toBeNull();
        expect( opts.type    ).toBeNull();
        expect( opts.id      ).toBeNull();
        expect( opts.options ).toBeNull();

        expect( registered ).toEqual(1);
      });

      it("should remove registered callback on the XMPP connection when the last subscription is removed", function(){
        var handref = {};
        var deregistered_handref;
        xmpp.addHandler = function(handler, ns, name, type, id, from, options){
          return handref;
        };
        xmpp.deleteHandler = function(ref){ deregistered_handref = ref; };

        subject = new klass({'connection': xmpp, 'pubsub': 'pubsub.test.host'});
        subject.subscribe("a node");
        subject.unsubscribe("a node");

        expect(deregistered_handref).toBe(handref);
      });

      it("should pass the message to the parser", function(){
        // Setup a parser
        var message;
        parser.parse = function(s){ message = s; };

        // Setup subscription
        subject.subscribe("a node");

        var payload = '<item xmlns="http://jabber.org/protocol/pubsub#event" id="1"><x xmlns="jabber:x:data" type="submit"><field var="bar" type="text-single"><value>foo</value></field></x></item>';

        // Pass stuff to channel
        var stanza = " \
          <message from='pubsub.shakespeare.lit' to='francisco@denmark.lit' id='foo'> \
            <event xmlns='http://jabber.org/protocol/pubsub#event'> \
              <items node='a node'>" +
                payload +
              "</items> \
            </event> \
          </message>";

        var run_again = message_handler(XML.stringToXML(stanza));

        // Check results
        expect(run_again).toBeTruthy();
        expect(message).toEqual(payload);
      });

      it("should trigger onMessage callbacks with the parsed item", function(){
        // Setup a parser
        parser.parse = function(s){ return s.toUpperCase(); };

        // Setup subscription
        subject.subscribe("a node");

        // Setup onMessage callback
        var sent_node, sent_id, sent_verb, sent_body;
        subject.onMessage.add(function(node,id,verb,m){sent_node = node; sent_id = id; sent_verb = verb; sent_body = m;});

        // Pass stuff to channel
        var stanza = " \
          <message from='pubsub.shakespeare.lit' to='francisco@denmark.lit' id='foo'> \
            <event xmlns='http://jabber.org/protocol/pubsub#event'> \
              <items node='a node'> \
                <item id='1'><payload>foo</payload></item> \
              </items> \
            </event> \
          </message>";

        message_handler(XML.stringToXML(stanza));

        // Check results
        expect(sent_node).toEqual('a node');
        expect(sent_id).toEqual('1');
        expect(sent_verb).toEqual('update');
        expect(sent_body).toEqual('<ITEM XMLNS="HTTP://JABBER.ORG/PROTOCOL/PUBSUB#EVENT" ID="1"><PAYLOAD>FOO</PAYLOAD></ITEM>');
      });

      it("should trigger onMessage callback for remove an item", function(){
        // Setup subscription
        subject.subscribe("a node");

        // Setup onMessage callback
        var sent_node, sent_id, sent_verb;
        subject.onMessage.add(function(node,id,verb){sent_node = node; sent_id = id; sent_verb = verb;});

        // Pass stuff to channel
        var stanza = " \
          <message from='pubsub.shakespeare.lit' to='francisco@denmark.lit' id='foo'> \
            <event xmlns='http://jabber.org/protocol/pubsub#event'> \
              <items node='a node'> \
                <retract id='1'/> \
              </items> \
            </event> \
          </message>";

        message_handler(XML.stringToXML(stanza));

        // Check results
        expect(sent_node).toEqual('a node');
        expect(sent_id).toEqual('1');
        expect(sent_verb).toEqual('remove');
      });

      it("should not trigger onMessage callbacks if it does not relate to a subscribed node", function(){
        subject.subscribe("a node");

        var called = 0;
        subject.onMessage.add(function(){ called += 1; });

        var stanza = " \
          <message from='pubsub.shakespeare.lit' to='francisco@denmark.lit' id='foo'> \
            <event xmlns='http://jabber.org/protocol/pubsub#event'> \
              <items node='a different node'> \
                <item id='1'><payload>foo</payload></item> \
              </items> \
            </event> \
          </message>";

        message_handler(XML.stringToXML(stanza));

        expect(called).toEqual(0);
      });

    });

  });

  describe("#subscriptions", function(){

    var xmpp;

    beforeEach(function(){
      xmpp = connection_builder();
      subject = new klass({'connection': xmpp});
    });

    it("should return successful subscriptions", function(){
      subject.subscribe("node_1");
      subject.subscribe("node_2");
      subject.subscribe("node_3");

      expect(subject.subscriptions()).toEqual(["node_1","node_2","node_3"]);
    });

    it("should not include unsuccessful subscriptions", function(){
      subject.subscribe("node_1");
      subject.subscribe("node_2");

      xmpp.sendIQ = function(stanza,success,failure){ failure(); };

      subject.subscribe("node_3");

      xmpp.sendIQ = function(){ /* do nothing */ };

      subject.subscribe("node_4");

      expect(subject.subscriptions()).toEqual(["node_1","node_2"]);

    });
  });

  describe("#subscribe", function(){

    var xmpp;

    beforeEach(function(){
      xmpp = connection_builder();

      subject = new klass({'connection': xmpp, 'pubsub': 'pubsub.test.host', 'parser': {}});
    });

    it("should send a subscribe message to the XMPP server", function(){
      var sent = "";
      xmpp.sendIQ = function(iq){ sent = iq.toString(); };

      subject.subscribe("some/node");

      var expectedStanza =
        "<iq to='pubsub.test.host' type='set' id='1' xmlns='jabber:client'><pubsub xmlns='http://jabber.org/protocol/pubsub'><subscribe node='some/node' jid='foo@test.host/123'/></pubsub></iq>";

      expect(sent).beEquivalentTo(expectedStanza);
    });

    it("should not send an additional subscription if is still waiting on a previous subscription", function(){
      var sent = 0;
      xmpp.sendIQ = function(iq){ sent += 1; };

      subject.subscribe("some/node");
      subject.subscribe("some/node");

      expect(sent).toEqual(1);

      subject.subscribe("different/node");

      expect(sent).toEqual(2);
    });

    it("should not send a subscribe message to the XMPP server if already subscribed", function(){
      var sent = 0;
      xmpp.sendIQ = function(iq,success){ sent += 1; success(); };

      subject.subscribe("some/node");
      subject.subscribe("some/node");

      expect(sent).toEqual(1);
    });

    it("should trigger callback if successful", function(){
      xmpp.sendIQ = function(iq,success){ success(); };

      var called = false;
      subject.onSubscribeSuccess.add(function(){
        called = true;
      });

      subject.subscribe("some/node");

      expect(called).toEqual(true);
    });

    it("should trigger callback if unsuccessful", function(){
      xmpp.sendIQ = function(iq,success,failure){ failure(); };

      var called = false;
      subject.onSubscribeFailure.add(function(){
        called = true;
      });

      subject.subscribe("some/node");

      expect(called).toEqual(true);
    });

  });

  describe("#unsubscribe", function(){

    var xmpp;

    beforeEach(function(){
      xmpp = connection_builder();
      subject = new klass({'connection': xmpp, 'pubsub': 'pubsub.test.host', 'parser': {}});
    });

    it("should send an unsubscribe message to the XMPP server", function(){
      subject.subscribe("some/node");

      var sent = "";
      xmpp.sendIQ = function(iq){ sent = iq.toString(); };

      subject.unsubscribe("some/node");

      var expectedStanza =
        "<iq to='pubsub.test.host' type='set' id='1' xmlns='jabber:client'><pubsub xmlns='http://jabber.org/protocol/pubsub'><unsubscribe node='some/node' jid='foo@test.host/123'/></pubsub></iq>";

      expect(sent).beEquivalentTo(expectedStanza);
    });

    it("should not send an unsubscribe message to the XMPP server if not already subscribed", function(){
      var sent = false;
      xmpp.sendIQ = function(iq){ sent = true; };

      subject.unsubscribe("some/node");

      expect(sent).toEqual(false);
    });

    it("should trigger callback if successful", function(){
      // Create subscription
      subject.subscribe("some/node");

      var called = false;
      subject.onUnsubscribeSuccess.add(function(){
        called = true;
      });

      subject.unsubscribe("some/node");

      expect(called).toEqual(true);
    });

    it("should trigger callback if unsuccessful", function(){
      // Create subscription
      subject.subscribe("some/node");

      // Setup failure
      xmpp.sendIQ = function(iq,success,failure){ failure(); };

      var called = false;
      subject.onUnsubscribeFailure.add(function(){
        called = true;
      });

      subject.unsubscribe("some/node");

      expect(called).toEqual(true);
    });

  });




});
