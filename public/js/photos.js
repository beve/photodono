define(['dojo/_base/declare', 'dojo/request', 'dojo/json', 'dojo/Evented'], function(declare, request, JSON, Evented) {

  return declare([Evented], {

    photosList: [],
    
    constructor: function () {
    },

    getList: function() {
      var self = this;
      request("/photos").then(function(list) {
        self.photosList = JSON.parse(list, true);
        self.emit("photosLoaded");
      });

    }
  });

})