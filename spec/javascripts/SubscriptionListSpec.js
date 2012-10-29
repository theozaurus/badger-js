describe("SubscriptionList",function(){

  var klass = com.jivatechnology.Badger.SubscriptionList;

  var subject;

  describe("initialization", function(){

    it("should allow the parameters to be specified", function(){
      subject = new klass({node: "foo", stateRequired: "subscribed", backends: []});

      expect( subject.node()          ).toEqual( "foo" );
      expect( subject.stateRequired() ).toEqual( "subscribed" );
      expect( subject.backends()      ).toEqual( [] );
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
        var b1 = {};
        var b2 = {};
        var b3 = {};

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
        var b1 = {};
        var b2 = {};
        var b3 = {};

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
        var b1 = {};
        var b2 = {};
        var b3 = {};

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
      it("should return the backends that have not attempted a connection", function(){
        var b1 = {};
        var b2 = {};
        var b3 = {};

        subject.backends([b1,b2,b3]);

        expect(subject.backendsUntried()).toEqual([b1,b2,b3]);

        subject.updateSubscription(b1,'pending');
        expect(subject.backendsUntried()).toEqual([b2,b3]);

        subject.updateSubscription(b2,'failed');
        expect(subject.backendsUntried()).toEqual([b3]);

        subject.updateSubscription(b3,'subscribed');
        expect(subject.backendsUntried()).toEqual([]);
      });
    });

    describe("#backends", function(){

      it("should be a getter and setter", function(){
        var p = [{},{}];
        subject.backends(p);

        expect(subject.backends()).toBe(p);
      });

    });

    describe("#updateSubscription", function(){

      it("should add the subscription to the list if it doesn't exist", function(){
        var b = {};

        subject.updateSubscription(b, "subscribed");

        expect( subject.stateFor(b) ).toEqual( "subscribed" );
      });

      it("should update the subscription in the list if it does exist", function(){
        var b = {};

        // Create it
        subject.updateSubscription(b,"pending");

        // Update it
        subject.updateSubscription(b,"subscribed");

        expect( subject.stateFor(b) ).toEqual( "subscribed" );
      });

    });

  });

});
