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
      var subscriptionUris = {};

      var isSubscribed = function(name){
        return ["subscribed","waiting"].indexOf(subscriptions[name]) >= 0;
      };

      var uriToName = function(uri){
        return subscriptionUris[uri];
      };

      var filterSubscriptions = function(filter){
        var filtered = [];
        for(var name in subscriptions){
          if(subscriptions.hasOwnProperty(name) && subscriptions[name] == filter){
            filtered.push(name);
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

      var subscriptionPending = function(name){
        subscriptions[name] = "pending";
        subscriptionUris[that.xmppUri(name)] = name;
      };

      var subscriptionWait = function(name){
        subscriptions[name] = "waiting";
        subscriptionUris[that.xmppUri(name)] = name;
      };

      var subscriptionSubscribe = function(name){
        if(that.subscriptions().length === 0){ addMessageHandler(); }
        subscriptions[name] = "subscribed";
        subscriptionUris[that.xmppUri(name)] = name;
      };

      var subscriptionRemove = function(name){
        if(that.subscriptions().length == 1){ removeMessageHandler(); }
        delete subscriptionUris[that.xmppUri(name)];
      };

      // Handle messages

      var processItems = function(service,$xml){
        var selector = "event[xmlns='http://jabber.org/protocol/pubsub#event'] > items";
        $xml.find(selector).each(function(i,items){
          var $items = $(items);
          var node = $items.attr('node');
          var uri = toXmppUri(service,node);
          var name = uriToName(uri);
          // check we are interested in said node
          if(isSubscribed(name)){
            // pick out updated items
            $items.find("> item").each(function(i,item){
              var $item = $(item);

              var id = $item.attr('id');
              var payload = XML.XMLToString(item);
              var parsed = that.parser().parse(payload);
              that.onMessage.handle(name, id,'update',parsed);
            });

            $items.find("> retract").each(function(i,item){
              var $item = $(item);

              var id = $item.attr('id');
              that.onMessage.handle(name, id,'remove');
            });
          }
        });
      };

      // If this spots we are subscribed multiple times - this will unsubscribe
      // us so that there is only one subscription left.
      // This can occur there is a page reload, and we persist our XMPP
      // connection - but we loose track of what we were subscribed to.
      var processShimHeaders = function(service,$xml){
        var selector = "headers[xmlns='http://jabber.org/protocol/shim']";
        $xml.find(selector).each(function(i,header){
          var $header    = $(header);
          var collection = $header.find("> header[name='Collection']");
          var node       = collection.text();

          var uri  = toXmppUri(service,node);
          var name = uriToName(uri);

          // Find header we are interested in
          if(collection.length > 0 && isSubscribed(name)){
            // Get subscription ids
            var sub_ids = $header.find("> header[name='SubID']").
                         map(function(i,header){ return $(header).text(); }).
                         toArray();

            // Discard first one
            sub_ids.shift();

            // Unsubscribe the rest
            $(sub_ids).each(function(i,subid){
              var stanza = unsubscribe_stanza(name,subid);
              var success = function(){}; // Managed to remove extra subscription
              var failure = function(){}; // Failed to remove extra subscription
              that.connection().sendIQ(stanza,success,failure,that.timeout());
            });
          }
        });
      };

      var onMessage = function(xml){
        // pick out nodes
        var $xml = $(xml);
        var service = $xml.filter("message").attr("from");
        processItems(service,$xml);
        processShimHeaders(service,$xml);

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
              var name = pending[i];
              that.subscribe(name);
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
              var name = subscribed[i];
              // Move subscribed subscriptions to pending
              subscriptionPending(name);
              // trigger onSubscribeFailure
              that.onSubscribeFailure.handle(name);
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
        from         = null;
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
      var pubsub_stanza = function(command,name,subid){
        var c   = that.connection();
        var uri = that.xmppUri(name);
        var r   = fromXmppUri(uri);
        var id  = c.getUniqueId('badger');
        var jid = c.jid;

        var attributes = { node: r.node, jid:  jid };

        if(typeof subid == "string"){
          attributes['subid'] = subid;
        }

        return $iq({to: r.service, type: 'set', id: id})
          .c('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub' })
          .c(command, attributes);
      };

      var subscribe_stanza = function(name){
        return pubsub_stanza("subscribe",name);
      };

      var unsubscribe_stanza = function(name,subid){
        return pubsub_stanza("unsubscribe",name,subid);
      };

      // XMPP URI encoding / decoding

      var toXmppUri = function(service, name){
        return "xmpp:" + service + "?;node=" + name;
      };

      var fromXmppUri = function(uri){
        results = /^xmpp:([^\?]+)\?;node=([^=]+)$/.exec(uri);
        return {
          service: results[1],
          node:    results[2]
        };
      };

      // Public methods

      this.parser     = function(){ return options.parser;     };
      this.connection = function(){ return options.connection; };
      this.timeout    = function(){ return options.timeout || 10000; };

      this.xmppUri    = function(name){
        var service = "pubsub." + Strophe.getDomainFromJid(that.connection().jid);
        return toXmppUri(service,name);
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

      this.subscribe = function(name){
        if(!isSubscribed(name)){
          var stanza  = subscribe_stanza(name);

          var success = function(){
            subscriptionSubscribe(name);
            that.onSubscribeSuccess.handle(name);
          };

          var failure = function(){
            subscriptionRemove(name);
            that.onSubscribeFailure.handle(name);
          };

          subscriptionPending(name);

          if(isStatusOffline()){
            that.onSubscribeFailure.handle(name);
          } else {
            subscriptionWait(name);
            that.connection().sendIQ(stanza,success,failure,that.timeout());
          }
        }
      };

      this.unsubscribe = function(name){
        if(isSubscribed(name)){
          var stanza = unsubscribe_stanza(name);

          var success = function(){
            subscriptionRemove(name);
            that.onUnsubscribeSuccess.handle(name);
          };

          var failure = function(){
            that.onUnsubscribeFailure.handle(name);
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
