require(['/js/photos.js', 'dojo/domReady!'], function(photos, on) {
  var p = new photos();
  p.getList(function(err, images) {
    console.log(images);
  });
});