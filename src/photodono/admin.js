define(['dojo/_base/declare', 'dojo/_base/array', 'dojo/_base/lang', 'dojo/Deferred', 'dojo/aspect', 'dojo/on', 'dojo/dom', 'dojo/dom-attr', 'dojo/dom-construct', 
             'dojo/dom-prop', 'dojo/query', 'dojo/request', 'dojo/parser', 'dojo/store/Memory', 'dojo/store/Observable', 'dojo/topic', 'dojo/json', 
             'dijit/registry', 'dijit/layout/BorderContainer', 'dijit/layout/ContentPane', 'dijit/form/TextBox', 'dijit/form/Button', 'dijit/Dialog', 'dijit/Menu', 'dijit/MenuItem', 
            'dijit/MenuBar', 'dijit/MenuBarItem', 'dijit/Tree', 'dijit/tree/ObjectStoreModel', 'dijit/tree/dndSource', 'photodono'], 
            function(declare, array, lang, Deferred, aspect, on, dom, domAttr, domConstruct, domProp, query, request, parser, Memory, Observable, topic, JSON, 
                  registry, BorderContainer, ContentPane, TextBox, Button, Dialog, Menu, MenuItem, MenuBar, MenuBarITem, Tree, ObjectStoreModel, dndSource, photodono) {

  return declare(null, {

    constructor: function() {

      this.photodono = new photodono();
      this.photodono.getList(lang.hitch(this, function(err) {
        if (!err) {
          this.buildTree();
          this.buildMenu();
          this.bindEvents();
        }
      }));
    },

    buildTree: function() {

      var self = this;

      this.photosStore = new Memory({
        data: this.photodono.list,
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
        },
        onChange: function (item) {}
      });

      aspect.around(self.photosStore, 'put', function(originalPut) {
        return function(obj, target) {
          if (target && target.parent) {
            obj.parent = target.parent.id;
          }
          return originalPut.call(self.photosStore, obj, target);
        };
      });

      this.tree = new Tree({
        model: treeModel,
        dndController: dndSource,
        openOnClick: false,
        autoExpand: false,
        onClick: function(item) {
          self.updateMainMenu(item);
          self.loadThumbnails(item);
        },
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
        }
      }));

    },

    bindEvents: function() {

      var self = this;

      on(registry.byId('mainMenuBtnRename'), 'click', function(evt) {
        var popup = registry.byId('popupRename');
        dom.byId('oldname').value = self.tree.selectedItems[0].path;
        dom.byId('newname').value = self.tree.selectedItems[0].name;
        popup.show();
        topic.publish('mainMenuButtonPressed', this.id);
      });

      on(registry.byId('mainMenuBtnRenameConfirm'), 'click', function(evt) {
        var oldname = dom.byId('oldname').value;
        var newname = dom.byId('newname').value;
        request.post("/rename", {data: {from: oldname, to: newname}, handleAs:'json'}).then(
          function(res) {
              var item = self.photosStore.query({'path': oldname});
              var oldpath = item[0].path.split('/');
              oldpath.pop();
              item[0].path = oldpath.join('/')+newname;
              item[0].name = newname;
              self.photosStore.put(item[0], {id: item[0].id, overwrite: true});
              registry.byId('popupRename').hide();
         },
         function(err) {
          console.log(err);
        });
        topic.publish('mainMenuButtonPressed', this.id);
      });

      on(registry.byId('mainMenuBtnDelete'), 'click', function(evt) {
        registry.byId('popupDelete').show();
        self.tree.selectedItems.forEach(function(item) {
          domConstruct.empty('filestodelete');
          domConstruct.create('div', {innerHTML: ' - '+item.name}, 'filestodelete');
        });
        topic.publish('mainMenuButtonPressed', this.id);
      });

      on(registry.byId('mainMenuBtnDeleteCancel'), 'click', function(evt) {
        registry.byId('popupDelete').hide();
        topic.publish('mainMenuButtonPressed', this.id);
      });

      on(registry.byId('mainMenuBtnDeleteConfirm'), 'click', function(evt) {
        var files = [];
        self.tree.selectedItems.forEach(function(item) {
          files.push(item.path);
        });
        request.post("/delete", {data: {files: files}, handleAs:'json'}).then(
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

      on(registry.byId('mainMenuBtnNewDirectoryConfirm'), 'click', function(evt) {
        var newdirname = dom.byId('newdirname').value;
        if (!newdirname) return false;
        var dir = (self.tree.selectedItems[0].path) ? self.tree.selectedItems[0].path+'/': '/';
        request.post("/newdirectory", {data: {dir: dir+newdirname}, handleAs:'json'}).then(
          function(res) {
            console.log(res);
          },
          function(err) {
            console.log(err);
          });
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
          if (item.parent !== undefined) {
            if (array.indexOf(fileButtons, child.get('action')) != -1) {
              child.set('disabled', false);
            }
          } else {
            if (array.indexOf(fileButtons, child.get('action')) == -1) {
              child.set('disabled', false);
            }
          }
        }
        });
      },

      loadThumbnails: function(item) {
        var center = dom.byId('center');
        var found = 0;
        domConstruct.empty(dom.byId('center'), 'html', '');
        var childs = this.photosStore.query({parent: this.tree.selectedItems[0].id});
        childs.forEach(function(child) {
          if (child.path.indexOf('_min') != -1) {
            var div = domConstruct.create('div', {class: "vignette"}, center);
            var img = domConstruct.create('img', {src: '/Photos/'+child.path}, div);
            found += 1;
          }
        });
        if (found === 0) {
          domConstruct.create('div', {innerHTML: 'No image in this directory'}, center);
        }
      }
  });

});
