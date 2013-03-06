describe("SubscriptionList",function(){

  var klass = com.jivatechnology.Badger.SubscriptionList;

  var subject;

  // Minimal dummy backend
  var backend_builder = function(){
    var subscriptions = [];
    var CallbackList = com.jivatechnology.CallbackList;
    return {
      onMessage: new CallbackList({must_keep:true})
    };
  };

  describe("initialization", function(){

    it("should allow the parameters to be specified", function(){
      subject = new klass({node: "foo", stateRequired: "subscribed", backends: []});

      expect( subject.node()          ).toEqual( "foo" );
      expect( subject.stateRequired() ).toEqual( "subscribed" );
      expect( subject.backends()      ).toEqual( [] );
    });

  });

  describe("message event from a registered backend", function(){

    var backend;

    beforeEach(function(){
      backend = backend_builder();
      subject = new klass({node: "foo", backends: [backend]});
    });

    it("should trigger onMessage callbacks with the parsed item if node matches", function(){
      var sent_id, sent_verb, sent_payload;

      subject.updateSubscription(backend,"subscribed");
      subject.onMessage.add(function(id,verb,payload){
        sent_id      = id;
        sent_verb    = verb;
        sent_payload = payload;
      });

      backend.onMessage.handle("foo","1","update","output");

      expect( sent_id      ).toEqual('1');
      expect( sent_verb    ).toEqual('update');
      expect( sent_payload ).toEqual('output');
    });

    it("should not trigger onMessage callbacks if the node does not match", function(){
      var called = false;

      subject.updateSubscription(backend,"subscribed");
      subject.onMessage.add(function(id,verb,payload){
        called = true;
      });

      backend.onMessage.handle("bar","1","update","output");

      expect( called ).toBeFalsy();
    });

  });

  describe("instance method", function(){

    beforeEach(function(){
      subject = new klass({node: "foo"});
    });

    describe("#node", function(){

      it("should be a getter only", function(){
        subject.node("bar");

        expect(subject.node()).toEqual("foo");
      });

    });

    describe("#stateRequired", function(){

      it("should be a getter and setter", function(){
        subject.stateRequired("unsubscribed");

        expect(subject.stateRequired()).toEqual("unsubscribed");
      });

    });

    describe("#stateAchieved", function(){

      it("should return the highest state achieved by any one of the backends", function(){
        var b1 = backend_builder();
        var b2 = backend_builder();
        var b3 = backend_builder();

        subject.backends = [b1,b2,b3];

        expect(subject.stateAchieved()).toEqual('failed');

        subject.updateSubscription(b3,'unsubscribed');
        expect(subject.stateAchieved()).toEqual('unsubscribed');

        subject.updateSubscription(b1,'pending');
        expect(subject.stateAchieved()).toEqual('pending');

        subject.updateSubscription(b2,'subscribed');
        expect(subject.stateAchieved()).toEqual('subscribed');

        subject.updateSubscription(b3,'failed');
        expect(subject.stateAchieved()).toEqual('subscribed');
      });

    });

    describe("#stateFor", function(){
      it("should return the highest state achieved by any one of the backends", function(){
        var b1 = backend_builder();
        var b2 = backend_builder();
        var b3 = backend_builder();

        subject.backends([b1,b2,b3]);

        subject.updateSubscription(b1,'pending');
        expect(subject.stateFor(b1)).toEqual('pending');

        subject.updateSubscription(b2,'subscribed');
        expect(subject.stateFor(b2)).toEqual('subscribed');

        subject.updateSubscription(b3,'failed');
        expect(subject.stateFor(b3)).toEqual('failed');
      });
    });

    describe("#backendsSubscribed", function(){
      it("should return the highest state achieved by any one of the backends", function(){
        var b1 = backend_builder();
        var b2 = backend_builder();
        var b3 = backend_builder();

        subject.backends([b1,b2,b3]);

        expect(subject.backendsSubscribed()).toEqual([]);

        subject.updateSubscription(b1,'pending');
        expect(subject.backendsSubscribed()).toEqual([]);

        subject.updateSubscription(b2,'subscribed');
        expect(subject.backendsSubscribed()).toEqual([b2]);

        subject.updateSubscription(b1,'subscribed');
        expect(subject.backendsSubscribed()).toEqual([b1,b2]);
      });
    });

    describe("#backendsUntried", function(){
      it("should return the backends that have not attempted a connection, or are unsubscribed", function(){
        var b1 = backend_builder();
        var b2 = backend_builder();
        var b3 = backend_builder();

        subject.backends([b1,b2,b3]);

        expect(subject.backendsUntried()).toEqual([b1,b2,b3]);

        subject.updateSubscription(b1,'pending');
        expect(subject.backendsUntried()).toEqual([b2,b3]);

        subject.updateSubscription(b2,'failed');
        expect(subject.backendsUntried()).toEqual([b3]);

        subject.updateSubscription(b3,'subscribed');
        expect(subject.backendsUntried()).toEqual([]);

        subject.updateSubscription(b3,'unsubscribed');
        expect(subject.backendsUntried()).toEqual([b3]);
      });
    });

    describe("#backends", function(){

      it("should be a getter and setter", function(){
        var p = [backend_builder(),backend_builder()];
        subject.backends(p);

        expect(subject.backends()).toBe(p);
      });

    });

    describe("#updateSubscription", function(){

      it("should add the subscription to the list if it doesn't exist", function(){
        var b = backend_builder();

        subject.updateSubscription(b, "subscribed");

        expect( subject.stateFor(b) ).toEqual( "subscribed" );
      });

      it("should update the subscription in the list if it does exist", function(){
        var b = backend_builder();

        // Create it
        subject.updateSubscription(b,"pending");

        // Update it
        subject.updateSubscription(b,"subscribed");

        expect( subject.stateFor(b) ).toEqual( "subscribed" );
      });

    });

  });

});
