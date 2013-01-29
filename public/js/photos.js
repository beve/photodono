define(['dojo/_base/declare', 'dojo/request', 'dojo/json', 'dojo/_base/lang', 'dijit/registry'], function(declare, request, JSON, lang, Evented) {

    return declare(null, {

      list: [],

      constructor: function() {
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
         return this.getFiles(lang.getObject(dottedPath, false, this.list), dottedPath.replace('.', '/'));
      },

      getFiles: function(obj, p) {
        var result = [];
        var filePath = p || '/';
        for(var key in obj){
            if(key == 'files' && typeof(obj[key] == 'array') ){
              obj.files.forEach(function(file) {
                result.push('Photos/'+filePath+'/'+file);
              });
            } else if (typeof obj[key] == 'object') {
              result = result.concat(this.getFiles(obj[key], filePath+'/'+key));
            }
        }
        return result;
      }

   });
});