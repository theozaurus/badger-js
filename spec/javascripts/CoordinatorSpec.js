describe("Badger.Coordinator",function(){

  var klass = com.jivatechnology.Badger.Coordinator;
  var CallbackList = com.jivatechnology.CallbackList;
  var subject;

  // Minimal dummy backend
  var backend_builder = function(){
    var subscriptions = [];
    return {
      subscriptions: function(){
        return subscriptions;
      },
      subscribe: function(n){
        subscriptions.push(n);
        this.onSubscribeSuccess.handle(n);
      },
      unsubscribe: function(n){
        subscriptions.splice(subscriptions.indexOf(n),1);
        this.onUnsubscribeSuccess.handle(n);
      },
      onMessage:            new CallbackList({must_keep:true}),
      onSubscribeSuccess:   new CallbackList({must_keep:true}),
      onSubscribeFailure:   new CallbackList({must_keep:true}),
      onUnsubscribeSuccess: new CallbackList({must_keep:true}),
      onUnsubscribeFailure: new CallbackList({must_keep:true})
    };
  };

  var failing_backend_builder = function(){
    var b = backend_builder();
    b.subscribe = function(n){ b.onSubscribeFailure.handle(n); };
    return b;
  };

  describe("#backends", function(){
    var b1, b2;

    beforeEach(function(){
      b1 = backend_builder();
      b2 = backend_builder();

      subject = new klass();
      subject.backendAppend(b1);
      subject.backendAppend(b2);
    });

    it("should return an array of the backends", function(){
      expect( subject.backends() ).toEqual([b1,b2]);
    });
  });

  describe("#backendAppend", function(){
    it("should add a backend with the lowest priority", function(){
      var b1 = backend_builder();
      var b2 = backend_builder();
      var b3 = backend_builder();

      subject = new klass();
      subject.backendAppend(b1);

      expect( subject.backends() ).toEqual([b1]);

      subject.backendAppend(b2);

      expect( subject.backends() ).toEqual([b1,b2]);

      subject.backendAppend(b3);

      expect( subject.backends() ).toEqual([b1,b2,b3]);

      subject.backendAppend(b1);

      expect( subject.backends() ).toEqual([b2,b3,b1]);
    });

    it("any outstanding subscriptions should be attempted", function(){
      var b1 = failing_backend_builder();
      var b2 = backend_builder();
      var subscribed_node;

      subject = new klass();
      subject.backendPrepend(b1);
      subject.subscribe("will work later");
      subject.onSubscribeSuccess.add(function(n){
        subscribed_node = n;
      });

      subject.backendAppend(b2);

      expect(subscribed_node).toEqual("will work later");
    });
  });

  describe("#backendPrepend", function(){

    it("should add a backend with the highest priority", function(){
      var b1 = backend_builder();
      var b2 = backend_builder();
      var b3 = backend_builder();

      subject = new klass();
      subject.backendPrepend(b1);

      expect( subject.backends() ).toEqual([b1]);

      subject.backendPrepend(b2);

      expect( subject.backends() ).toEqual([b2,b1]);

      subject.backendPrepend(b3);

      expect( subject.backends() ).toEqual([b3,b2,b1]);

      subject.backendPrepend(b1);

      expect( subject.backends() ).toEqual([b1,b3,b2]);
    });

    it("all subscriptions should be attempted", function(){
      // Given
      var b1 = backend_builder();
      var b2 = backend_builder();
      subject = new klass();

      subject.backendPrepend(b1);
      subject.subscribe("node");

      // When
      subject.backendPrepend(b2);

      // Then
      expect( b2.subscriptions() ).toEqual( ["node"] );
    });

    it("if a new subscription is successful then it should remove from all other backends", function(){
      // Given
      var b1 = backend_builder();
      var b2 = backend_builder();
      subject = new klass();

      subject.backendPrepend(b1);
      subject.subscribe("node");

      // When
      subject.backendPrepend(b2);

      // Then
      expect( b1.subscriptions() ).toEqual( [] );
    });
  });

  describe("#hint", function(){
    it("should called #hint on the subscribed backends", function(){
      var called = false;
      var b1 = backend_builder();

      b1.hint = function(){ called = true; };

      subject.backendPrepend(b1);
      subject.subscribe("node");

      subject.hint("node");

      expect(called).toBeTruthy();
    });
  });

  describe("#subscriptions", function(){

    beforeEach(function(){
      subject = new klass();
      subject.backendAppend(backend_builder());
    });

    it("should return list of subscriptions", function(){
      subject.subscribe("node1");
      subject.subscribe("node2");

      expect( subject.subscriptions() ).toEqual( {"node1": "subscribed", "node2": "subscribed"} );
    });

  });

  describe("#subscribe", function(){

    var broken, working;

    beforeEach(function(){
      broken  = failing_backend_builder();
      working = backend_builder();

      subject = new klass();
    });

    it("should attempt to subscribe on highest priority backend, then the next", function(){
      var order = [];
      broken.onSubscribeFailure.add(function(){ order.push(1); });
      working.onSubscribeSuccess.add(function(){ order.push(2); });

      subject.backendAppend(broken);
      subject.backendAppend(working);

      subject.subscribe("node");

      expect([1,2]).toEqual( [1,2] );
    });

    it("should trigger callback if a backend can do it", function(){
      subject.backendAppend(broken);
      subject.backendAppend(working);

      var done = false;
      subject.onSubscribeSuccess.add(function(){ done = true; });

      subject.subscribe("node");

      expect(done).toEqual(true);
    });

    it("should trigger callback if no backend can do it", function(){
      subject.backendAppend(broken);
      subject.backendAppend(failing_backend_builder());

      var done = false;
      subject.onSubscribeFailure.add(function(){ done = true; });

      subject.subscribe("node");

      expect(done).toEqual(true);
    });

    it("should return the subscriptionList", function(){
      var returned = subject.subscribe("foo");

      expect(returned).toBeInstanceOf(com.jivatechnology.Badger.SubscriptionList);
    });

  });

  describe("#unsubscribe", function(){

    var broken, working;

    beforeEach(function(){
      subject = new klass();
    });

    it("should trigger callback if successful", function(){
      subject.backendAppend(backend_builder());
      subject.subscribe("node");

      var called;

      subject.onUnsubscribeSuccess.add(function(){ called = true; });

      subject.unsubscribe("node");

      expect(called).toBe(true);
    });

    it("should trigger callback if unsuccessful", function(){
      broken  = backend_builder();
      broken.unsubscribe = function(n){ broken.onUnsubscribeFailure.handle(n); };

      subject.backendAppend(broken);
      subject.subscribe("node");

      var called;

      subject.onUnsubscribeFailure.add(function(){ called = true; });

      subject.unsubscribe("node");

      expect(called).toBe(true);
    });

  });

});
