require(['photos', 'dojo/dom', "dijit/Dialog", 'dojo/domReady!'], function(photos, dom, Dialog) {
  var p = new photos();
  p.getList(function(err) {
    if (!err) {
       myDialog = new Dialog({
            title: "My Dialog",
            content: "Test content.",
            style: "width: 300px"
        });
       myDialog.show();

      var f = p.getFromPath('02_Sport.01_VTT');
      console.log(f);
    }
  });

});
