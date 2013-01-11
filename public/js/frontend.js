require(['/js/photos.js', 'dojo/on', 'dojo/domReady!'], function(photos, on) {
  var p = new photos();
  p.getList();
  p.on('photosLoaded', function(e) {
    console.log(p.photosList);
  });
});