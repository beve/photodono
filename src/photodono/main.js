define(['dojo/_base/declare', 'dojo/request', 'dojo/json', 'dojo/_base/lang'], function(declare, request, JSON, lang) {

    return declare(null, {

      list: [],

      constructor: function() {
      },

      getCategories: function(cb) {
        var self = this;
        request("/categories", {handleAs:'json'}).then(
           function(categories) {
             self.categories = categories;
             cb(null);
           },
           function(err) {
             console.log(err);
           }
         );
       },

      getThumbnails: function(args, cb) {
        request.get("/thumbnails", {handleAs:'json', data: args}).then(
           function(thumbs) {
             cb(thumbs);
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