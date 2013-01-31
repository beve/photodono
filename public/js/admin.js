require(['photos', 'dojo/store/Memory', 'dojo/store/Observable',
        'dijit/Tree', 'dijit/tree/ObjectStoreModel', 'dijit/tree/dndSource', 'dojo/domReady!'], function(photos, Memory, Observable, Tree, ObjectStoreModel, dndSource) {
  var p = new photos();

  p.getList(function(err) {
    if (!err) {

      var photosStore = new Memory({
        data: p.list,
        getChildren: function(object){
          return this.query({parent: object.id});
        }

      })

      var model = new ObjectStoreModel({
          store: photosStore,

          query: {id: "/"},

          mayHaveChildren: function(object){
            return this.store.getChildren(object).length > 0;
          }
        });

      tree = new Tree({
        model: model,
        dndController: dndSource
          }, "tree"); // make sure you have a target HTML element with this id
      tree.startup();
      //var f = p.getListFromPath(path);
      //grid.adopt(f);
      //console.log(p.list);
    }
  });

});
