//= require callback
//= require ./subscription_list

(function(){

  var scope = this;

  this.Coordinator = (function(){

    return function(){

      var that = this;

      // Backend handling

      var backends = [];
      var isBackendPresent = function(b){ return backends.indexOf(b) >= 0; };
      var removeBackend = function(b){
        var index = backends.indexOf(b);
        backends.splice(index,1);
      };

      var setupBackend = function(b){
        b.onSubscribeSuccess.add(function(n){
          updateSubscription(n,b,'subscribed');
          pareBackendFor(n);

          // Tell the world
          if(subscriptions[n].stateRequired() == 'subscribed'){
            that.onSubscribeSuccess.handle(n);
          }
        });

        b.onSubscribeFailure.add(function(n){
          updateSubscription(n,b,'failed');
          subscribeBackendFor(n);

          // Tell the world
          if(subscriptions[n].stateRequired == 'subscribed'){
            if(!subscribeBackendFor(n)){
              that.onSubscribeFailure.handle(n);
            }
          }
        });

        b.onUnsubscribeSuccess.add(function(n){
          updateSubscription(n,b,'unsubscribed');

          // Tell the world
          var sub = subscriptions[n];
          if(sub.stateRequired() != 'subscribed' && sub.stateAchieved() != 'subscribed'){
            that.onUnsubscribeSuccess.handle(n);
          }
        });

        b.onUnsubscribeFailure.add(function(n){
          // Tell the world
          var sub = subscriptions[n];
          if(sub.stateRequired() != 'subscribed' && sub.stateAchieved() == 'subscribed'){
            that.onUnsubscribeFailure.handle(n);
          }

          updateSubscription(n,b,'unsubscribed');
        });

        b.onMessage.add(function(id,verb,payload){
          that.onMessage.handle(id,verb,payload);
        });
      };

      var backendSort = function(unsorted){
        var sorted = [];
        for(var i in backends){
          if(backends.hasOwnProperty(i)){
            var backend = backends[i];
            if(unsorted.indexOf(backend) >= 0){
              sorted.push(backends[i]);
            }
          }
        }
        return sorted;
      };

      // Subscription handling

      var subscriptions = {};

      var addSubscription = function(n){
        if(!subscriptions[n]){
          subscriptions[n] = new scope.SubscriptionList({node: n, backends: backends, stateRequired: 'subscribed'});
          subscribeBackendFor(n);
        } else {
          subscriptions[n].stateRequired('subscribed');
          subscribeBackendFor(n);
        }
      };

      var removeSubscription = function(n){
        if(subscriptions[n]){
          subscriptions[n].stateRequired("unsubscribed");
          unsubscribeBackendsFor(n);
        }
      };

      var updateSubscription = function(n,b,state){
        subscriptions[n].updateSubscription(b,state);
      };

      // Logic to manage subscribing and unsubscribing backends

      var subscribeBackendFor = function(node){
        // Try some more backend
        var b;
        var subscriptionList = subscriptions[node];
        var untried = subscriptionList.backendsUntried();
        if( untried.length > 0 ){
          // Try highest priority
          b = backendSort(untried).shift();
          b.subscribe(node);
        } else {
          // Out of luck
          that.onSubscribeFailure.handle(node);
        }
        return b;
      };

      var unsubscribeBackendsFor = function(node){
        var subscriptionList = subscriptions[node];
        subscribed = subscriptionList.backendsSubscribed();
        for(var ii in subscribed){
          if(subscribed.hasOwnProperty(ii)){
            b = subscribed[ii];
            b.unsubscribe(node);
          }
        }
      };

      var pareBackendFor = function(node){
        var subscriptionList = subscriptions[node];
        subscribed = subscriptionList.backendsSubscribed();
        var sorted = backendSort(subscribed);
        sorted.shift(); // ignore highest priority subscribed
        for(var i in sorted){
          if(sorted.hasOwnProperty(i)){
            var b = sorted[i];
            b.unsubscribe(node);
          }
        }
      };

      // Public methods

      //// Subscriptions

      this.subscriptions = function(){
        var result = {};
        for(var n in subscriptions){
          if(subscriptions.hasOwnProperty(n)){
            result[n] = subscriptions[n].stateAchieved();
          }
        }
        return result;
      };

      this.subscribe = function(n){
        addSubscription(n);
      };

      this.unsubscribe = function(n){
        removeSubscription(n);
      };

      //// Backends

      this.backendAppend = function(b){
        if(isBackendPresent(b)){
          removeBackend(b);
        } else {
          setupBackend(b);
        }
        backends.push(b);

        // Look at all failed subscriptions
        var all = that.subscriptions();
        for(var n in all){
          if(all.hasOwnProperty(n)){
            if(all[n] == "failed"){
              subscribeBackendFor(n);
            }
          }
        }
      };

      this.backendPrepend = function(b){
        if(isBackendPresent(b)){
          removeBackend(b);
        } else {
          setupBackend(b);
        }
        backends.unshift(b);

        // Look at all subscriptons
        var all = that.subscriptions();
        for(var n in all){
          if(all.hasOwnProperty(n)){
            subscribeBackendFor(n);
          }
        }
      };

      this.backends = function(){
        return backends;
      };

      //// Callbacks

      var CallbackList = com.jivatechnology.CallbackList;
      this.onSubscribeSuccess   = new CallbackList({must_keep:true});
      this.onSubscribeFailure   = new CallbackList({must_keep:true});
      this.onUnsubscribeSuccess = new CallbackList({must_keep:true});
      this.onUnsubscribeFailure = new CallbackList({must_keep:true});
      this.onMessage            = new CallbackList({must_keep:true});

    };

  })();

}).call(com.jivatechnology.Badger);
