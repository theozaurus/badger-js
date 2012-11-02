(function(){

  this.SubscriptionList = (function(){

    var merge_options = function(obj1,obj2){
      obj1 = obj1 || {};
      obj2 = obj2 || {};
      var obj3 = {};
      for (var attr1 in obj1) {
        if( obj1.hasOwnProperty(attr1) ){ obj3[attr1] = obj1[attr1]; }
      }
      for (var attr2 in obj2) {
        if( obj2.hasOwnProperty(attr2) ){ obj3[attr2] = obj2[attr2]; }
      }
      return obj3;
    };

    var create_getter_setter = function(options,name){
      return function(){
        if( arguments.length == 1 ){
          // Setter
          options[name] = arguments[0];
          return options[name];
        } else {
          // Getter
          return options[name];
        }
      };
    };

    var next_id = 1;
    var idFor = function(obj){
      if ( obj === null ){ return null; }
      if ( !obj.__obj_id ){ obj.__obj_id = next_id++; }
      return obj.__obj_id;
    };

    return function(opts){
      var defaults = {stateRequired: "subscribed", backends: []};
      var options  = merge_options(defaults, opts);

      var that = this;

      var subscriptions = {};

      var priorities = ['failed','unsubscribed','pending','subscribed'];
      var priority = function(s){
        return priorities.indexOf(s);
      };

      var backendOnMessageCallback = function(node,id,verb,payload){
        if(node == that.node()){ that.onMessage.handle(id,verb,payload); }
      };

      var callbacksAddedTo = [];
      var setupCallbacksFor = function(b){
        var id = idFor(b);
        if(callbacksAddedTo.indexOf(b) < 0){
          b.onMessage.add(backendOnMessageCallback);
          callbacksAddedTo.push(id);
        }
      };

      var backendsFilter = function(fun){
        var results = [];
        var backends = that.backends();
        for(var i in backends){
          if(backends.hasOwnProperty(i)){
            var backend = backends[i];
            fun(results,backend);
          }
        }
        return results;
      };

      this.node = function(){ return options.node; };

      this.updateSubscription = function(b,state){
        subscriptions[idFor(b)] = state;
        setupCallbacksFor(b);
      };

      this.stateRequired = create_getter_setter(options,"stateRequired");
      this.stateAchieved = function(){
        var highest = "failed";
        for(var id in subscriptions){
          if(subscriptions.hasOwnProperty(id)){
            var state = subscriptions[id];
            if(priority(highest) < priority(state)){
              highest = state;
            }
          }
        }
        return highest;
      };

      this.stateFor = function(b){
        return subscriptions[idFor(b)];
      };

      this.backends = create_getter_setter(options,"backends");

      this.backendsSubscribed = function(){
        return backendsFilter(function(results,backend){
          if(that.stateFor(backend) == "subscribed"){
            results.push(backend);
          }
        });
      };

      this.backendsUntried = function(){
        return backendsFilter(function(results,backend){
          if(!that.stateFor(backend)){
            results.push(backend);
          }
        });
      };

      var CallbackList = com.jivatechnology.CallbackList;
      this.onMessage = new CallbackList({must_keep:true});

    };

  })();

}).call(com.jivatechnology.Badger);
