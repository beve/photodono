define.amd.jQuery = true;
require(['/js/photos.js', 'dojo/dom', 'dojo/domReady!'], function(photos, dom, jQuery) {
  var p = new photos();
  p.getList(function(err) {
    if (!err) {
      var f = p.getFromPath('02_Sport.01_VTT');
      console.log(f);
    }
  });


});
