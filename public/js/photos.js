define(['dojo/_base/declare', 'dojo/request', 'dojo/json', 'dojo/Evented'], function(declare, request, JSON, Evented) {

  return declare([Evented], {

    constructor: function () {
      this.photosList = [];
    },

    getList: function(callback) {
      request("/photos", {handleAs:'json'}).then(
         function(list) {
           callback(null, list);
         },
         function(err) {
           console.log(err); 
         }
       );
     }

   });
});