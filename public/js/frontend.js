require(['photos', 'dojo/dom', "dijit/Dialog", 'dojo/domReady!'], function(photos, dom, Dialog) {
  var p = new photos();
  p.getList(function(err) {
    if (!err) {
      var f = p.getListFromPath('01_Architecture');
    }
  });

});
