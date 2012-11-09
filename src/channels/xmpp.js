//= require callback
//= require strophe
//= require ../utils/xml

if (!com.jivatechnology.Badger.Channel) { com.jivatechnology.Badger.Channel = {}; }

(function(){

  var XML = com.jivatechnology.Badger.Utils.XML;

  this.XMPP = (function(){

    return function(options){
      options = options || {};

      var that = this;

      // Track subscriptions

      var subscriptions = {};

      var isSubscribed = function(node){
        return subscriptions.hasOwnProperty(node);
      };

      var addPendingSubscription = function(node){
        subscriptions[node] = "pending";
      };

      var addSubscription = function(node){
        if(that.subscriptions().length === 0){ addMessageHandler(); }
        subscriptions[node] = "subscribed";
      };

      var removeSubscription = function(node){
        if(that.subscriptions().length == 1){ removeMessageHandler(); }
        delete subscriptions[node];
      };

      // Handle messages

      var onMessage = function(m){
        // pick out nodes
        var doc = XML.stringToXML(m);
        $(doc).find("event[xmlns='http://jabber.org/protocol/pubsub#event'] > items").each(function(i,items){
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

      // XMPP bits

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
            addSubscription(node);
            that.onSubscribeSuccess.handle(node);
          };

          var failure = function(){
            removeSubscription(node);
            that.onSubscribeFailure.handle(node);
          };

          addPendingSubscription(node);

          that.connection().sendIQ(stanza,success,failure,that.timeout());
        }
      };

      this.unsubscribe = function(node){
        if(isSubscribed(node)){
          var stanza  = unsubscribe_stanza(node);

          var success = function(){
            removeSubscription(node);
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
    };

  })();

}).call(com.jivatechnology.Badger.Channel);
