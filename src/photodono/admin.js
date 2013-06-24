define(['dojo/_base/declare', 'photodono/main', 'dojo/_base/url', 'dojo/_base/array', 'dojo/_base/lang', 'dojo/Deferred', 'dojo/aspect', 'dojo/on', 'dojo/dom', 'dojo/dom-attr', 'dojo/dom-style', 'dojo/dom-construct', 
			 'dojo/dom-prop', 'dojo/query', 'dojo/request', 'dojo/parser', 'dojo/store/Memory', 'dojo/store/Observable', 'dojo/topic', 'dojo/json', 'dojo/dom-form',
			 'dijit/registry', 'dijit/layout/BorderContainer', 'dijit/layout/ContentPane', 'dijit/form/Form', 'dijit/form/Select', 'dijit/form/TextBox', 'dijit/form/ValidationTextBox', 'dijit/form/Button', 'dijit/form/SimpleTextarea', 'dijit/Toolbar', 
			 'dijit/ToolbarSeparator', 'dijit/Dialog', 'dijit/Tree', 'dijit/tree/ObjectStoreModel', 'dijit/tree/dndSource', 'dijit/Editor', 'dijit/form/NumberSpinner', 'dijit/ProgressBar', 'dojox/form/Uploader',
			 'dojox/widget/Toaster', 'dijit/_editor/plugins/TextColor', 'dijit/_editor/plugins/FontChoice', 'dijit/_editor/plugins/LinkDialog', 'dijit/_editor/plugins/FullScreen', 'dojox/form/uploader/FileList'], 
			function(declare, photodono, url, array, lang, Deferred, aspect, on, dom, domAttr, domStyle, domConstruct, domProp, query, request, parser, Memory, Observable, topic, JSON, dojoForm,
				  registry, BorderContainer, Form, Select, ContentPane, TextBox, ValidationTextBox, Button, SimpleTextarea, Toolbar, ToolbarSeparator, Dialog , Tree, ObjectStoreModel, dndSource, Editor, NumberSpinner, ProgressBar, Uploader,  Toaster) {

  return declare(photodono, {

  	constructor: function() {
  		this.initSocketIo();
  		this.photodono = new photodono();
  		this.progressbars = {};
  		this.photodono.getCategories(lang.hitch(this, function(err) {
  			if (!err) {
  				this.buildTree();
  				this.bindEvents();
  			}
  		}));
  	},

  	initSocketIo: function() {
  		var self = this;
  		this.socket = io.connect((new url(document.URL).scheme)+'://'+(new url(document.URL).authority));
  		this.socket.emit('connection');
  		this.socket.on('connected', function(socketId) {
  			self.socket.id = socketId;
  		});
  		this.socket.on('beginImageProcessing', function(data) {
  			self.progressbars[data.hash] = new ProgressBar({}).placeAt('progressbarContainer');
  		});
  		this.socket.on('imageProcessing', function(data) {
  			self.progressbars[data.hash].set({value: data.percent});
  		});
  		this.socket.on('message', function(msg) {
  			dom.byId('activityMessage').innerHTML = msg;
  		});
  	},

  	getThumbnails: function(args, cb) {
		this.photodono.getThumbnails({categoryId: categoryId}, lang.hitch(this, function(thumbs) {
			this.displayThumbnails(thumbs);
		}));
  	},		

	buildTree: function() {

	  var self = this;

	  this.photosStore = new Memory({
		data: this.photodono.categories,
		getChildren: function(object){
		  return this.query({parent: object.id});
		}

	  });

	  this.photosStore = new Observable(this.photosStore);

	  var treeModel = new ObjectStoreModel({
		store: this.photosStore,
		query: {id: 1},
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
		  self.editCategory(item);		
		},
		getIconClass: function(item, opened){
		  return (opened ? 'dijitFolderOpened' : 'dijitFolderClosed');
		}
	  }, "tree");
	  this.tree.startup();
	},

	sendFiles: function() {
		dom.byId('activityMessage').innerHTML = 'Envoi des fichiers';
	  	domStyle.set('fileList', 'display', 'block');
	},

	filesSent: function(thumbs) {
	  	domConstruct.empty('progressbarContainer');
	  	this.displayThumbnails(thumbs);
			registry.byId('uploadDialog').hide();
	},

	displayThumbnails: function(thumbs) {
		var thumbsDir = dom.byId('thumbsContainer');
		domConstruct.empty(thumbsDir);
		if (thumbs.images && thumbs.images.length > 0) {
			thumbs.images.forEach(function(thumb) {
				var div = domConstruct.create('div', {class: "thumb"}, thumbsDir);
				var img = domConstruct.create('img', {src: thumbs.path+'/'+thumb.path, class: 'thumb'}, div);
			});
		} else {
			domConstruct.create('div', {innerHTML: 'No image in this directory'}, thumbsDir);
		}
	},

	bindEvents: function() {

	  var self = this;

	  return;

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

	},

	editCategory: function(item) {
		var self = this;
		registry.byId('thumbPane').domNode.style.display = 'block';
		registry.byId('subBorderContainer').resize();
		dom.byId('categoryId').value = item.id;
		dom.byId('socketId').value = this.socket.id;
		request.get('/category/'+item.id, {handleAs:'json'}).then(
		  function(res) {
		  	self.updateMainContent(res.content);
		  	self.displayThumbnails(res.images);
		 },
		 function(err) {
		  console.log(err);
		});
	},

	newCategory: function(item) {
		var self = this;
		registry.byId('thumbPane').domNode.style.display = 'none';
		registry.byId('subBorderContainer').resize();
		request.get('/category', {handleAs:'json'}).then(
		  function(res) {
		  	self.updateMainContent(res.content);
		 },
		 function(err) {
		  console.log(err);
		});
	},

	updateCategory: function(action) {
		request.post('/category', {data: dojoForm.toObject('category'), handleAs:'json'}).then(
		  function(res) {
		  	topic.publish("toasterMessage", {
      				message: (res.err ? res.err : res.msg),
       			type: (res.err ? 'fatal' : 'message'),
      				duration: 1000
    			 });
		 },
		 function(err) {
		  console.log(err);
		 });
	},

	updateMainContent: function(html) {
	  	var mainContent = registry.byId('mainContent');
	  	registry.findWidgets(mainContent.domNode).forEach(function(el) {el.destroyRecursive();});
	 	mainContent.domNode.innerHTML = html;
	 	parser.parse(mainContent.domNode);
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
	  }

  });

});
