require(['photodono', 'dojo/domReady!'], function(photodono) {
  var p = new photodono();
  var path = '';

  p.getList(function(err) {
    if (!err) {
      //var f = p.getListFromPath(path);
      //grid.adopt(f);
      //console.log(p.list);
    }
  });

});
