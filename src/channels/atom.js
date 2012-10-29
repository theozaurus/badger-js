//= require callback
//= require jquery

if (!com.jivatechnology.Badger.Channel) { com.jivatechnology.Badger.Channel = {}; }

(function(){

  this.Atom = (function(){

    return function(opts){

      var that = this;

      var options = opts || {};

      // Handle polling
      var polls = {};

      var poll = function(node){
        var success = function(body){
          if(isPending(node)){
            addSubscription(node);
            that.onSubscribeSuccess.handle(node);
          }

          process(node, body);

          // Queue next poll
          polls[node] = setTimeout(function(){ poll(node); }, that.delay());
        };

        var failure = function(){
          removeSubscription(node);
          that.onSubscribeFailure.handle(node);
        };

        var url = that.urlFor(node);
        var jqxhr = $.ajax( url ).done( success ).fail( failure );
      };

      var clearPoll = function(node){
        clearTimeout(polls[node]);
      };

      // Process requests

      var processedItems = {};

      var process = function(node, body){
        var oldDataCache = processedItems[node] || {};

        // Extract data
        var newDataCache = {};
        var payloads = {};

        var entries = $(body).find("entry");
        entries.each(function(i,e){
          var $e = $(e);
          var id = $e.find("id").html();
          var updated = $e.find("updated").html();

          // Store the updated value to help us compare for changes
          newDataCache[id] = updated;

          // Store the body so we can process it if there are changes
          payloads[id] = $e.html();
        });

        var id;
        // Whats been added or updated
        for(id in newDataCache){
          if(newDataCache.hasOwnProperty(id)){
            if(oldDataCache[id] != newDataCache[id]){
              var payload = that.parser().parse(payloads[id]);

              that.onMessage.handle(id,"update",payload);
            }
          }
        }

        // Whats been removed
        for(id in oldDataCache){
          if(oldDataCache.hasOwnProperty(id)){
            if(!newDataCache.hasOwnProperty(id)){
              that.onMessage.handle(id,"remove");
            }
          }
        }

        // Update store
        processedItems[node] = newDataCache;
      };

      // Track subscriptions

      var subscriptions = {};

      var isPending = function(node){
        return subscriptions[node] == "pending";
      };

      var isSubscribed = function(node){
        return subscriptions.hasOwnProperty(node);
      };

      var addPendingSubscription = function(node){
        subscriptions[node] = "pending";
      };

      var addSubscription = function(node){
        subscriptions[node] = "subscribed";
      };

      var removeSubscription = function(node){
        delete subscriptions[node];
      };


      // Public methods

      this.parser = function(){ return options.parser; };
      this.delay  = function(){ return options.delay || 3000; };

      this.urlFor = function(node){ return node; };

      this.subscriptions = function(){
        var connected_subscriptions = [];
        for(var n in subscriptions){
          if(subscriptions.hasOwnProperty(n) && subscriptions[n] == "subscribed"){
            connected_subscriptions.push(n);
          }
        }
        return connected_subscriptions;
      };

      this.subscribe = function(node){
        if(!isSubscribed(node)){
          addPendingSubscription(node);
          poll(node);
        }
      };

      this.unsubscribe = function(node){
        if(isSubscribed(node)){
          removeSubscription(node);
          that.onUnsubscribeSuccess.handle(node);

          clearPoll(node);
        }
      };


      // Callbacks

      var CallbackList = com.jivatechnology.CallbackList;

      this.onSubscribeSuccess   = new CallbackList({must_keep:true});
      this.onSubscribeFailure   = new CallbackList({must_keep:true});
      this.onUnsubscribeSuccess = new CallbackList({must_keep:true});
      this.onUnsubscribeFailure = new CallbackList({must_keep:true});
      this.onMessage            = new CallbackList({must_keep:true});
    };

  })();

}).call( com.jivatechnology.Badger.Channel );
