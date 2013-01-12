define(['dojo/_base/declare', 'dojo/request', 'dojo/json', 'dojo/_base/lang', 'dojo/Evented'], function(declare, request, JSON, lang, Evented) {

  return declare([Evented], {

    constructor: function () {
      this.list = [];
    },

    getList: function(callback) {
      var self = this;
      request("/photos", {handleAs:'json'}).then(
         function(list) {
           self.list = list;
           callback(null);
         },
         function(err) {
           console.log(err); 
         }
       );
     },

     getFromPath: function(dottedPath) {
        var list = lang.getObject(dottedPath, false, this.list);
        return list; 
     }

   });
});