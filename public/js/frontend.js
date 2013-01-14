require(['photos', 'dojo/dom', "dojo/dom-construct", 'dojo/domReady!'], function(photos, dom, domConstruct, Dialog) {
  var p = new photos();
  p.getList(function(err) {
    if (!err) {
      var f = p.getListFromPath('02_Sport.02_Moto');
			var wall = dom.byId('wall');
      f.forEach(function(photoUrl) {
				var parent = domConstruct.create('div', {class: 'miniature'}, wall);
				domConstruct.create('img', {src: photoUrl}, parent)
      });
    }
  });

});
