/*jshint multistr:true */

describe("Badger.Parser.DataForm", function(){

  var klass = com.jivatechnology.Badger.Parser.DataForm;

  describe("#parse",function(){

    var subject;

    beforeEach(function(){
      subject = new klass();
    });

    it("should return a simple object when nothing passed in", function(){
      expect(subject.parse()).toEqual({'title': null, 'instructions': null, 'fields': {}});
    });

    it("should return an object representing each field", function(){
      var dataform =
        "<item id='10'> \
          <x xmlns='jabber:x:data' type='form'> \
            <title>Bot Configuration</title> \
            <instructions>Fill out this form to &lt;i&gt;configure&lt;/i&gt; your new bot!</instructions> \
            <field type='hidden' \
                   var='FORM_TYPE'> \
              <value>jabber:bot</value> \
            </field> \
            <field type='fixed'><value>Section 1: Bot Info</value></field> \
            <field type='text-single' \
                   label='The name of your bot' \
                   var='botname'/> \
            <field type='text-multi' \
                   label='Helpful description of your bot' \
                   var='description'/> \
            <field type='boolean' \
                   label='Public bot?' \
                   var='public'> \
              <required/> \
            </field> \
            <field type='text-private' \
                   label='Password for special access' \
                   var='password'/> \
            <field type='fixed'><value>Section 2: Features</value></field> \
            <field type='list-multi' \
                   label='What features will the bot support?' \
                   var='features'> \
              <option label='Contests'><value>contests</value></option> \
              <option label='News'><value>news</value></option> \
              <option label='Polls'><value>polls</value></option> \
              <option label='Reminders'><value>reminders</value></option> \
              <option label='Search'><value>search</value></option> \
              <value>news</value> \
              <value>search</value> \
            </field> \
            <field type='fixed'><value>Section 3: Subscriber List</value></field> \
            <field type='list-single' \
                   label='Maximum number of subscribers' \
                   var='maxsubs'> \
              <value>20</value> \
              <option label='10'><value>10</value></option> \
              <option label='20'><value>20</value></option> \
              <option label='30'><value>30</value></option> \
              <option label='50'><value>50</value></option> \
              <option label='100'><value>100</value></option> \
              <option label='None'><value>none</value></option> \
            </field> \
            <field type='fixed'><value>Section 4: Invitations</value></field> \
            <field type='jid-multi' \
                   label='People to invite' \
                   var='invitelist'> \
              <desc>Tell all your friends about your new bot!</desc> \
            </field> \
          </x> \
        </item>";

      var result = {
        "title":        "Bot Configuration",
        "instructions": "Fill out this form to <i>configure</i> your new bot!",
        "fields": {
          "FORM_TYPE":   "jabber:bot",
          "botname":     null,
          "description": [],
          "public":      false,
          "password":    null,
          "features":    ["news","search"],
          "maxsubs":     "20",
          "invitelist":  []
        }
      };
      expect(subject.parse(dataform)).toEqual(result);
    });

  });

});
