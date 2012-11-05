/*jshint multistr:true */

describe("Badger.Parser.Atom", function(){

  var klass = com.jivatechnology.Badger.Parser.Atom;

  describe("#parse",function(){

    var subject;

    beforeEach(function(){
      subject = new klass();
    });

    it("should return a simple object when nothing passed in", function(){
      expect(subject.parse()).toEqual({});
    });

    it("should return an object representing each field", function(){
      var atom_entry =
        '<entry> \
           <title>Atom draft-07 snapshot</title> \
           <link rel="alternate" type="text/html" \
            href="http://example.org/2005/04/02/atom"/> \
           <link rel="enclosure" type="audio/mpeg" length="1337" \
            href="http://example.org/audio/ph34r_my_podcast.mp3"/> \
           <id>tag:example.org,2003:3.2397</id> \
           <updated>2005-07-31T12:29:29Z</updated> \
           <published>2003-12-13T08:29:29-04:00</published> \
           <summary>Some text.</summary> \
           <author> \
             <name>Mark Pilgrim</name> \
             <uri>http://example.org/</uri> \
             <email>f8dy@example.com</email> \
           </author> \
           <contributor> \
             <name>Sam Ruby</name> \
           </contributor> \
           <contributor> \
             <name>Joe Gregorio</name> \
           </contributor> \
           <source> \
             <id>tag:foo.org,2003,123</id> \
             <author> \
               <name>Bob</name> \
               <uri>http://bob.org/</uri> \
             </author> \
           </source> \
           <rights>Copyright (c) 2003, Mark Pilgrim</rights> \
           <content type="xhtml" xml:lang="en" xml:base="http://diveintomark.org/"><div xmlns="http://www.w3.org/1999/xhtml"><p><i>[Update: The Atom draft is finished.]</i></p></div></content> \
         </entry>';

      var expected = {
        id:      "tag:example.org,2003:3.2397",
        title:   "Atom draft-07 snapshot",

        // Optional
        rights:    "Copyright (c) 2003, Mark Pilgrim",
        source:    {
          id: "tag:foo.org,2003,123",
          author: [
            {name: "Bob", uri: "http://bob.org/"}
          ]
        },
        summary:   "Some text.",
        content:   '<div xmlns="http://www.w3.org/1999/xhtml"><p><i>[Update: The Atom draft is finished.]</i></p></div>',

        // Many
        link: [
          { rel: "alternate", type: "text/html",  href: "http://example.org/2005/04/02/atom" },
          { rel: "enclosure", type: "audio/mpeg", href: "http://example.org/audio/ph34r_my_podcast.mp3" }
        ],
        author: [
          {name: "Mark Pilgrim", uri: "http://example.org/", email: "f8dy@example.com"}
        ],
        contributor: [
          {name: "Sam Ruby"},
          {name: "Joe Gregorio"}
        ]
      };

      var result = subject.parse(atom_entry);

      // Remove dates because these cannot be compared
      var updated = result.updated;
      var published = result.published;

      delete result.updated;
      delete result.published;

      // Test result
      expect(result).toEqual(expected);

      // Test dates
      expect( updated.getTime()   ).toEqual( Date.UTC(2005,6,31,12,29,29) );
      expect( published.getTime() ).toEqual( Date.UTC(2003,11,13,12,29,29) );
    });

  });

});
