define(['dojo/_base/declare', 'dojo/_base/array', 'dojo/_base/lang', 'dojo/Deferred', 'dojo/aspect', 'dojo/on', 'dojo/dom', 'dojo/dom-attr', 'dojo/query', 'dojo/request', 'dojo/parser', 'dojo/store/Memory', 'dojo/store/Observable', 'dojo/topic', 'dojo/json', 'dijit/registry', 'dijit/layout/BorderContainer', 'dijit/layout/ContentPane', 'dijit/form/TextBox', 'dijit/form/Button', 'dijit/Dialog', 'dijit/Menu', 'dijit/MenuItem', 'dijit/MenuBar', 'dijit/MenuBarItem', 'dijit/Tree', 'dijit/tree/ObjectStoreModel', 'dijit/tree/dndSource', 'photos'], function(declare, array, lang, Deferred, aspect, on, dom, domAttr, query, request, parser, Memory, Observable, topic, JSON, registry, BoerderContainer, ContentPane, TextBox, Button, Dialog, Menu, MenuItem, MenuBar, MenuBarITem, Tree, ObjectStoreModel, dndSource, photos) {

  return declare(null, {

    constructor: function() {

      this.photos = new photos();
      this.photos.getList(lang.hitch(this, function(err) {
        if (!err) {
          this.buildTree();
          this.buildMenu();
          this.bindEvents();
        }
      }));
    },

    buildTree: function() {

      this.photosStore = new Memory({
        data: this.photos.list,
        getChildren: function(object){
          return this.query({parent: object.id});
        }

      });

      this.photosStore = new Observable(this.photosStore);

      var treeModel = new ObjectStoreModel({
        store: this.photosStore,
        query: {id: 0},
        mayHaveChildren: function(object){
          return this.store.getChildren(object).length > 0;
        }
      });

      aspect.around(this.photosStore, 'put', function(originalPut) {
        return function(obj, target) {
          if (target && target.parent) {
            obj.parent = target.parent.id;
          }
          return originalPut.call(this.photosStore, obj, target);
        };
      });

      this.tree = new Tree({
        model: treeModel,
        dndController: dndSource,
        openOnClick: false,
        autoExpand: false,
        onClick: lang.hitch(this,function(item) {
          this.updateMainMenu(item);
        }),
        getIconClass: function(item, opened){
          return (item.type == 'dir') ? (opened ? 'dijitFolderOpened' : 'dijitFolderClosed') : 'dijitLeaf';
        }
      }, "tree");
      this.tree.startup();
    },

    buildMenu: function() {

      var menu = new Menu({
        targetNodeIds: ["tree"],
        selector: "span"
      });

      menu.addChild(new MenuItem({
        label: "Delete",
        onClick: function(evt){
          console.log(this.photosStore.query({parent: this.tree.selectedItems[0].id}));
        }
      }));

    },

    bindEvents: function() {

      var self = this;

      on(registry.byId('mainMenuBtnRename'), 'click', function(evt) {
        var popup = registry.byId('popupRename');
        popup.getChildren()[0].set('value', self.tree.selectedItems[0].name);
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
        self.tree.selectedItems.forEach(function(item) {
          console.log(item.path);
        });
        return;
        request.get("/delete", {query: {path: 'pouet/poeut/pouet'}, handleAs:'json'}).then(
          function(res) {
           console.log(res);
         },
         function(err) {
          console.log(err);
        });
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

    },

    updateMainMenu: function(item) {
      var fileButtons = ['Rename', 'Delete'];
      var multipleButtons = ['Delete'];
      var mainMenu = registry.byId('mainMenu');
      var self = this;

      array.forEach(mainMenu.getChildren(), function(child) {
        child.set('disabled', true);
        if (item.parent !== undefined && self.tree.selectedItems.length == 1 && self.tree.selectedItems[0].type == 'dir') {
          child.set('disabled', false);
        } else if (self.tree.selectedItems.length > 1){
          stop = false;
          array.forEach(self.tree.selectedItems, function(si) {
            if (si.id === 0) {
              stop = true;
            }
          });
          if (!stop && array.indexOf(multipleButtons, child.get('action')) != -1) {
            child.set('disabled', false);
          }
        } else {
          if (array.indexOf(fileButtons, child.get('action')) != -1) {
            child.set('disabled', false);
          }
        }
        });
      }
  });

});
