//= require callback
//= require jquery
//= require ../utils/xml

if (!com.jivatechnology.Badger.Channel) { com.jivatechnology.Badger.Channel = {}; }

(function(){

  var XML = com.jivatechnology.Badger.Utils.XML;

  this.Atom = (function(){

    return function(opts){

      var that = this;

      var options = opts || {};

      // Handle polling
      var polls = {};

      var poll = function(node){
        var success = function(body){
          if(isPending(node)||isRetrying(node)){
            addSubscription(node);
            that.onSubscribeSuccess.handle(node);
          }

          process(node, body);

          // Queue next poll
          polls[node] = setTimeout(function(){ poll(node); }, that.delay());
        };

        var failure = function(s){
          var previouslyRetrying = isRetrying(node);
          if(s.readyState === 0){
            // Server unavailable, network?
            addRetryingSubscription(node);
            polls[node] = setTimeout(function(){ poll(node); }, that.retryDelay());
          } else {
            removeSubscription(node);
          }
          if(!previouslyRetrying){
            that.onSubscribeFailure.handle(node);
          }
        };

        var url = that.urlFor(node);
        var settings = {headers: {Accept: "application/atom+xml"}, dataType: "text"};
        var jqxhr = $.ajax( url, settings ).done( success ).fail( failure );
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

        var entries = $(XML.stringToXML(body)).find("entry");
        entries.each(function(i,e){
          var $e = $(e);
          var id = XML.XMLContentsToString($e.find("id")[0]);
          var updated = XML.XMLContentsToString($e.find("updated")[0]);

          // Store the updated value to help us compare for changes
          newDataCache[id] = updated;

          // Store the body so we can process it if there are changes
          payloads[id] = XML.XMLToString(e);
        });

        var id;
        // Whats been added or updated
        for(id in newDataCache){
          if(newDataCache.hasOwnProperty(id)){
            if(oldDataCache[id] != newDataCache[id]){
              var payload = that.parser().parse(payloads[id]);

              that.onMessage.handle(node, id, "update", payload);
            }
          }
        }

        // Whats been removed
        for(id in oldDataCache){
          if(oldDataCache.hasOwnProperty(id)){
            if(!newDataCache.hasOwnProperty(id)){
              that.onMessage.handle(node, id, "remove");
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

      var isRetrying = function(node){
        return subscriptions[node] == "retrying";
      };

      var isSubscribed = function(node){
        return subscriptions.hasOwnProperty(node);
      };

      var addPendingSubscription = function(node){
        subscriptions[node] = "pending";
      };

      var addRetryingSubscription = function(node){
        subscriptions[node] = "retrying";
      };

      var addSubscription = function(node){
        subscriptions[node] = "subscribed";
      };

      var removeSubscription = function(node){
        delete subscriptions[node];
      };


      // Public methods

      this.name = 'Atom';

      this.parser     = function(){ return options.parser; };
      this.delay      = function(){ return options.delay      || 3000; };
      this.retryDelay = function(){ return options.retryDelay || 10000; };

      this.urlFor = function(node){ return node; };

      // Used if we have extra information that a node is likely to have been
      // updated - will cause a poll to happen immediately
      this.hint = function(node){
        if(isSubscribed(node)){
          clearPoll(node);
          poll(node);
        }
      };

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
