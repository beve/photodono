define.amd.jQuery = true;
require(['/js/photos.js', 'dojo/dom', 'jquery', 'jquery!imagesloaded', 'dojo/domReady!'], function(photos, dom, jQuery) {
  var p = new photos();
  p.getList(function(err) {
    if (!err) {
      var f = p.getFromPath('02_Sport.01_VTT');
      console.log(f);
    }
  });

console.log('ici');
  var toto = jQuery('#viewport').imagesLoaded(function(i, p, b) {

  });
  //console.log(toto.imagesLoaded);


});