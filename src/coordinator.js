//= require callback
//= require ./subscription_list
//= require ./logger

(function(){

  var scope = this;

  var logger = function(level){
    var args = Array.prototype.slice.call(arguments,1);
    args.unshift('Badger Coordinator:');
    scope.Logger[level].apply(this,args);
  };

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
          logger('debug','Subscribed to "'+n+'" on backend "'+b.name+'"');
          updateSubscription(n,b,'subscribed');
          pareBackendFor(n);

          // Tell the world
          if(subscriptions[n].stateRequired() == 'subscribed'){
            that.onSubscribeSuccess.handle(n);
          }
        });

        b.onSubscribeFailure.add(function(n){
          logger('warn','Failed to subscribed to "'+n+'" with backend "'+b.name+'"');
          updateSubscription(n,b,'failed');
          subscribeBackendFor(n);
        });

        b.onUnsubscribeSuccess.add(function(n){
          logger('debug','Unsubscribed from "'+n+'" on backend "'+b.name+'"');
          updateSubscription(n,b,'unsubscribed');

          // Tell the world
          var sub = subscriptions[n];
          if(sub.stateRequired() != 'subscribed' && sub.stateAchieved() != 'subscribed'){
            that.onUnsubscribeSuccess.handle(n);
          }
        });

        b.onUnsubscribeFailure.add(function(n){
          logger('warn','Failed to unsubscribe from "'+n+'" on backend "'+b.name+'"');

          // Tell the world
          var sub = subscriptions[n];
          if(sub.stateRequired() != 'subscribed' && sub.stateAchieved() == 'subscribed'){
            that.onUnsubscribeFailure.handle(n);
          }

          updateSubscription(n,b,'unsubscribed');
        });

        b.onMessage.add(function(node,id,verb,payload){
          that.onMessage.handle(node,id,verb,payload);
        });
      };

      var backendSort = function(unsorted){
        var sorted = [];
        for(var i = 0; i < backends.length; i++){
          var backend = backends[i];
          if(unsorted.indexOf(backend) >= 0){
            sorted.push(backends[i]);
          }
        }
        return sorted;
      };

      // Subscription handling

      var subscriptions = {};

      var addSubscription = function(n){
        var subscriptionList = subscriptions[n];
        if(!subscriptionList){
          subscriptionList = new scope.SubscriptionList({node: n, backends: backends, stateRequired: 'subscribed'});
          subscriptions[n] = subscriptionList;
          subscribeBackendFor(n);
        } else {
          subscriptionList.stateRequired('subscribed');
          subscribeBackendFor(n);
        }
        return subscriptionList;
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
          logger('debug','Trying to subscribe to "'+node+'" with backend "'+b.name+'"');
          b.subscribe(node);
        } else {
          // Out of luck
          that.onSubscribeFailure.handle(node);
          logger('debug','No other backends available for subscription "'+node+'"');
        }
        return b;
      };

      var unsubscribeBackendsFor = function(node){
        var subscriptionList = subscriptions[node];
        subscribed = subscriptionList.backendsSubscribed();
        for(var i = 0; i < subscribed.length; i++){
          b = subscribed[i];
          b.unsubscribe(node);
        }
      };

      var pareBackendFor = function(node){
        var subscriptionList = subscriptions[node];
        subscribed = subscriptionList.backendsSubscribed();
        var sorted = backendSort(subscribed);
        sorted.shift(); // ignore highest priority subscribed
        for(var i = 0; i < sorted.length; i++){
          var b = sorted[i];
          logger('debug','Pairing subscription to "'+node+'" on backend "'+b.name+'" as no longer required');
          b.unsubscribe(node);
        }
      };

      // Public methods

      //// Subscriptions

      ///// Used if we know that a node has actually changed
      ///// Useful for backends that are not push
      this.hint = function(node){
        var subscriptionList = subscriptions[node];
        if( typeof subscriptionList === "undefined"){ return; }
        subscribed = subscriptionList.backendsSubscribed();
        for(var i = 0; i < subscribed.length; i++){
          b = subscribed[i];
          // Test backend supports hint
          if(typeof b.hint === "function"){
            b.hint(node);
          }
        }
      };

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
        return addSubscription(n);
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
