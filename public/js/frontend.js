require(['simplegrid', 'photos', 'dojo/domReady!'], function(simpleGrid, photos) {
  var p = new photos();
  var grid = new simpleGrid('viewport', {elementDimensions: {w: 100, h: 100}});
  var path = '';

  p.getList(function(err) {
    if (!err) {
      //var f = p.getListFromPath(path);
      //grid.adopt(f);
      //console.log(p.list);
    }
  });

});
