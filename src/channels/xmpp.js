//= require callback
//= require strophe
//= require ../utils/xml

if (!com.jivatechnology.Badger.Channel) { com.jivatechnology.Badger.Channel = {}; }

(function(){

  var XML = com.jivatechnology.Badger.Utils.XML;

  //
  // Code to help signal status back to our channel from Strophe
  //

  var xmppStatusFuncs = [];
  var lastStatus, lastCondition;
  var statusChanged = function(status,condition){
    for(var i in xmppStatusFuncs){
      if(xmppStatusFuncs.hasOwnProperty(i)){
        // `this` is passed to the function
        // so it can identify if this statusChange comes from the correct
        // Strophe connection
        xmppStatusFuncs[i].call(this,status,condition);
      }
    }
    lastStatus = status;
    lastCondition = condition;
  };

  var strophePluginName = "badger";
  if(Strophe){
    Strophe.addConnectionPlugin(strophePluginName,{
      init:          function(){ return true; },
      statusChanged: statusChanged
    });
  }

  //
  // The channel
  //

  this.XMPP = (function(){

    return function(options){
      options = options || {};

      var that = this;

      // Track subscriptions

      var subscriptions = {};

      var isSubscribed = function(node){
        return ["subscribed","waiting"].indexOf(subscriptions[node]) >= 0;
      };

      var filterSubscriptions = function(filter){
        var filtered = [];
        for(var node in subscriptions){
          if(subscriptions.hasOwnProperty(node) && subscriptions[node] == filter){
            filtered.push(node);
          }
        }
        return filtered;
      };

      var subscriptionsPending = function(){
        return filterSubscriptions("pending");
      };

      var subscriptionsSubscribed = function(){
        return filterSubscriptions("subscribed");
      };

      //// Handle subscription state

      var subscriptionPending = function(node){
        subscriptions[node] = "pending";
      };

      var subscriptionWait = function(node){
        subscriptions[node] = "waiting";
      };

      var subscriptionSubscribe = function(node){
        if(that.subscriptions().length === 0){ addMessageHandler(); }
        subscriptions[node] = "subscribed";
      };

      var subscriptionRemove = function(node){
        if(that.subscriptions().length == 1){ removeMessageHandler(); }
        delete subscriptions[node];
      };

      // Handle messages

      var onMessage = function(xml){
        // pick out nodes
        $(xml).find("event[xmlns='http://jabber.org/protocol/pubsub#event'] > items").each(function(i,items){
          var $items = $(items);
          var node = $items.attr('node');

          // check we are interested in said node
          if(isSubscribed(node)){
            // pick out updated items
            $items.find("> item").each(function(i,item){
              var $item = $(item);

              var id = $item.attr('id');
              var payload = XML.XMLToString(item);
              var parsed = that.parser().parse(payload);
              that.onMessage.handle(node, id,'update',parsed);
            });

            $items.find("> retract").each(function(i,item){
              var $item = $(item);

              var id = $item.attr('id');
              that.onMessage.handle(node, id,'remove');
            });
          }

        });

        // Strophe needs this
        return true;
      };

      var onStatusChanged = function(status,condition){
        // Horrible hack to get around Strophes statusChanged plugin system
        // Check that our connections badger plugin matches the plugin
        // we just got a message from
        if( this === that || this === that.connection()[strophePluginName] ){
          if( [Strophe.Status.CONNECTED,Strophe.Status.ATTACHED].indexOf(status) >= 0 ){
            statusOnline();
          } else {
            statusOffline();
          }
        }
      };

      var status = "offline";
      var statusOnline = function(){
        if(status == "offline"){
          status = "online";

          // Attempt pending subscriptions
          var pending = subscriptionsPending();
          for(var i in pending){
            if(pending.hasOwnProperty(i)){
              var node = pending[i];
              that.subscribe(node);
            }
          }
        }
      };

      var statusOffline = function(){
        if(status == "online"){
          status = "offline";

          var subscribed = subscriptionsSubscribed();
          for(var i in subscribed){
            if(subscribed.hasOwnProperty(i)){
              var node = subscribed[i];
              // Move subscribed subscriptions to pending
              subscriptionPending(node);
              // trigger onSubscribeFailure
              that.onSubscribeFailure.handle(node);
            }
          }
        }
      };

      var isStatusOnline = function(){
        return status == "online";
      };

      var isStatusOffline = function(){
        return status == "offline";
      };

      // XMPP bits

      //// Adds handler for incoming messages
      var stropheMessageHandler;
      var addMessageHandler = function(){
        handler      = onMessage;
        ns           = null;
        element_name = "message";
        type         = null;
        id           = null;
        from         = that.pubsub();
        opts         = null;

        stropheMessageHandler = that.connection().addHandler( handler, ns, element_name, type, id, from, opts );
      };

      var removeMessageHandler = function(){
        if(stropheMessageHandler){
          that.connection().deleteHandler(stropheMessageHandler);
          stropheMessageHandler = null;
        }
      };

      //// Stanza builder
      var pubsub_stanza = function(command,node){
        var c       = that.connection();
        var service = that.pubsub();
        var id      = c.getUniqueId('badger');
        var jid     = c.jid;

        return $iq({to: service, type: 'set', id: id})
          .c('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub' })
          .c(command, {node: node, jid: jid});
      };

      var subscribe_stanza = function(node){
        return pubsub_stanza("subscribe",node);
      };

      var unsubscribe_stanza = function(node){
        return pubsub_stanza("unsubscribe",node);
      };

      // Public methods

      this.parser     = function(){ return options.parser;     };
      this.connection = function(){ return options.connection; };
      this.pubsub     = function(){ return options.pubsub;     };
      this.timeout    = function(){ return options.timeout || 10000; };

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
          var stanza  = subscribe_stanza(node);

          var success = function(){
            subscriptionSubscribe(node);
            that.onSubscribeSuccess.handle(node);
          };

          var failure = function(){
            subscriptionRemove(node);
            that.onSubscribeFailure.handle(node);
          };

          subscriptionPending(node);

          if(isStatusOffline()){
            that.onSubscribeFailure.handle(node);
          } else {
            subscriptionWait(node);
            that.connection().sendIQ(stanza,success,failure,that.timeout());
          }
        }
      };

      this.unsubscribe = function(node){
        if(isSubscribed(node)){
          var stanza = unsubscribe_stanza(node);

          var success = function(){
            subscriptionRemove(node);
            that.onUnsubscribeSuccess.handle(node);
          };

          var failure = function(){
            that.onUnsubscribeFailure.handle(node);
          };

          that.connection().sendIQ(stanza,success,failure,that.timeout());
        }
      };

      // Callbacks
      var CallbackList = com.jivatechnology.CallbackList;
      this.onSubscribeSuccess   = new CallbackList({must_keep:true});
      this.onSubscribeFailure   = new CallbackList({must_keep:true});
      this.onUnsubscribeSuccess = new CallbackList({must_keep:true});
      this.onUnsubscribeFailure = new CallbackList({must_keep:true});
      this.onMessage            = new CallbackList({must_keep:true});

      // Allow Strophe connection plugin to signal to this channel
      xmppStatusFuncs.push(onStatusChanged);
      // Signal what happened last
      if(lastStatus){ onStatusChanged.call(this, lastStatus,lastCondition); }
    };

  })();

}).call(com.jivatechnology.Badger.Channel);
