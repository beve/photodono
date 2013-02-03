require(['dojo/_base/array', 'dojo/parser', 'dojo/store/Memory', 'dojo/store/Observable', 'dojo/json',
        'dijit/registry', 'dijit/Menu', 'dijit/MenuItem', 'dijit/MenuBar', 'dijit/MenuBarItem', 'dijit/Tree', 'dijit/tree/ObjectStoreModel', 'dijit/tree/dndSource', 'photos', 'dojo/domReady!'], function(array, parser, Memory, Observable, JSON, registry, Menu, MenuItem, MenuBar, MenuBarITem, Tree, ObjectStoreModel, dndSource, photos) {
  var p = new photos();

  p.getList(function(err) {
    if (!err) {
      var photosStore = new Memory({
        data: p.list,
        getChildren: function(object){
          return this.query({parent: object.id});
        }

      });

      photosStore = new Observable(photosStore);

      var model = new ObjectStoreModel({
          store: photosStore,

          query: {id: "/"},

          mayHaveChildren: function(object){
            return (object.type == 'dir') ? true : false;
            //return this.store.getChildren(object).length > 0;
          }
        });

      var tree = new Tree({
        model: model,
        dndController: dndSource,
        onClick: function(item) {
          var mainMenu = registry.byId('mainMenu');
          if (mainMenu.get('active') !== true) {
            array.forEach(mainMenu.getChildren(), function(child) {
              child.set('disabled', false)
            });
            mainMenu.set('active', true);
          }
          //console.log(item);
        }
          }, "tree"); // make sure you have a target HTML element with this id
      tree.startup();
      //var f = p.getListFromPath(path);
      //grid.adopt(f);
      //console.log(p.list);
    }

    var menu = new Menu({
        targetNodeIds: ["tree"],
        selector: "span"
    });
    menu.addChild(new MenuItem({
        label: "Delete",
        onClick: function(evt){
           // var node = this.getParent().currentTarget;
            //var selectedObject = tree.get("selectedItems")[0];
            //console.log(selectedObject);
            console.log(tree);
        }
    }));

  });

});
