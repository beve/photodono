require(['dojo/_base/array', 'dojo/Deferred', 'dojo/aspect', 'dojo/on', 'dojo/dom', 'dojo/dom-attr', 'dojo/query', 'dojo/request', 'dojo/parser', 'dojo/store/Memory', 'dojo/store/Observable', 'dojo/topic', 'dojo/json',
        'dijit/registry', 'dijit/layout/BorderContainer', 'dijit/layout/ContentPane', 'dijit/form/TextBox', 'dijit/form/Button', 'dijit/Dialog', 'dijit/Menu', 'dijit/MenuItem', 'dijit/MenuBar', 'dijit/MenuBarItem', 'dijit/Tree', 'dijit/tree/ObjectStoreModel', 'dijit/tree/dndSource', 'photos', 'dojo/domReady!'], function(array, Deferred, aspect, on, dom, domAttr, query, request, parser, Memory, Observable, topic, JSON, registry, BoerderContainer, ContentPane, TextBox, Button, Dialog, Menu, MenuItem, MenuBar, MenuBarITem, Tree, ObjectStoreModel, dndSource, photos) {

  var p = new photos();

  var fileButtons = ['Rename', 'Delete'];
  var multipleButtons = ['Delete'];

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

      aspect.around(photosStore, "put", function(originalPut){
        return function(obj, target){
          if (target && target.parent){
            obj.parent = target.parent.id;
          }
          return originalPut.call(photosStore, obj, target);
        }
      });

      var tree = new Tree({
        model: model,
        dndController: dndSource,
        onClick: function(item) {
          var mainMenu = registry.byId('mainMenu');
          array.forEach(mainMenu.getChildren(), function(child) {
            if (tree.selectedItems.length == 1 && (tree.selectedItems[0].type == 'dir' || (array.indexOf(fileButtons, child.get('action')) != -1))) {
              child.set('disabled', false);
            } else if (tree.selectedItems.length > 1){
              if (array.indexOf(multipleButtons, child.get('action')) != -1) {
                child.set('disabled', false);
              } else {
                child.set('disabled', true);
              }
            } else {
              child.set('disabled', true);
            }
          });
        }
      }, "tree");
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

    on(registry.byId('mainMenuBtnRename'), 'click', function(evt) {
      //var input = dijit.byNode(query('input[type=text]', 'popupRename'));
      var popup = registry.byId('popupRename');
      popup.getChildren()[0].set('value', tree.selectedItems[0].name);
      popup.show();
      topic.publish('mainMenuButtonPressed', this.id);
    });

    on(registry.byId('mainMenuBtnDelete'), 'click', function(evt) {
      registry.byId('popupDelete').show();
      topic.publish('mainMenuButtonPressed', this.id);
    });

    on(registry.byId('mainMenuBtnDeleteCancel'), 'click', function(evt) {
      registry.byId('popupDelete').hide();
      topic.publish('mainMenuButtonPressed', this.id);
    });

    on(registry.byId('mainMenuBtnDeleteConfirm'), 'click', function(evt) {
      // SEND
      topic.publish('mainMenuButtonPressed', this.id);
    });

    on(registry.byId('mainMenuBtnNewDirectory'), 'click', function(evt) {
      registry.byId('popupNewDirectory').show();
      topic.publish('mainMenuButtonPressed', this.id);
    });

    on(registry.byId('mainMenuBtnUpload'), 'click', function(evt) {
      registry.byId('popupUpload').show();
      topic.publish('mainMenuButtonPressed', this.id);
    });

    topic.subscribe('mainMenuButtonPressed', function(text) {
      console.log(text);
    });

  });

});
