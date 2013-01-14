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

    getListFromPath: function(dottedPath) {
       return this.getFiles(lang.getObject(dottedPath, false, this.list));
    },

    getFiles: function(obj) {
      var result = [];
      for(var key in obj){
          if(key == 'files' && typeof(obj[key] == 'array') ){
            result = result.concat(obj.files);
          } else if (typeof obj[key] == 'object') {
            result = result.concat(this.getFiles(obj[key]));
          }
      }
      return result;
    }

   });
});