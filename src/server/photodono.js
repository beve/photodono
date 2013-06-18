var fs = require('fs');
var path = require('path');
var AdmZip = require('adm-zip');
var gm = require('gm');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var findit = require('findit');
var crypto = require('crypto');
var Sequelize = require('sequelize');
var _ = require('underscore');

 var photodono = module.exports = function photodono(config) {
 	this.config = config;
	this.categories = [];
	this.imgdir = __dirname+'..'+path.sep+'..'+path.sep+'..'+path.sep+path.normalize(this.config.imgdir);
	var self = this;

	// Connect to database
	var sequelize = new Sequelize(config.database.database, config.database.user, config.database.password, {
		host: config.database.host,
		port: config.database.port,
		dialect: config.database.protocol,
		logging: config.database.logging
	});

	this.Category = sequelize.define('Category', {
		name: { type: Sequelize.STRING, unique: true, allowNull: false},
		heading: Sequelize.TEXT,
		description: Sequelize.TEXT,
		position: Sequelize.INTEGER,
		parent: Sequelize.INTEGER,
		active: {type: Sequelize.BOOLEAN, default: false}
	});

	this.Image = sequelize.define('Image', {
		name: { type: Sequelize.STRING, allowNull: false},
		description: Sequelize.TEXT,
		path: { type: Sequelize.STRING, unique: true},
		position: Sequelize.INTEGER,
		active: { type: Sequelize.BOOLEAN, default: false}
	});

	/*
	this.ImageType = sequelize.define('ImageType', {
		name: {type: Sequelize.STRING, unique: true, allowNull: false},
		width: {type: Sequelize.INTEGER, allowNull: false},
		height: {type: Sequelize.INTEGER, allowNull: false},
		dir: {type: Sequelize.STRING, unique: true, allowNull: false}
	});
	*/

	this.Image.hasMany(this.Category);
	this.Category.hasMany(this.Image);
	/*this.ImageType.hasMany(this.Image);
	this.Image.hasMany(this.ImageType);*/

	sequelize.sync({force: true}).success(function() {
		console.log('Database synchronized.')
		// Check if root category exists or create it
		self.Category.findOrCreate({id: 1}, {name: 'root', description: 'Top level category', position: 0}).success(function(category, created) {
			if (created) {
				console.log('Top level category created.');
			}
			// Populate categories
			self.populateCategories();
		});
		/*
		// Create default images types
		self.config.imgtypes.forEach(function(imgtype) {
			self.ImageType.findOrCreate({name: imgtype.name}, {name: imgtype.name, width: imgtype.width, height: imgtype.height, dir: imgtype.dir}).success(function(it, created) {
				if (created) {
					var destDir = path.normalize(self.imgdir+path.sep+imgtype.dir);
					if (!fs.existsSync(destDir)) {
						mkdirp.sync(destDir)
					}
					console.log('Image type created: '+it.name);
				}	
			});
		});
		*/
	}).error(function(error) {
		console.log('Database sync error: '+error);
	})
};


photodono.prototype = {

	createCategory: function(fields, cb) {

	},

	getCategory: function(id, cb) {
		this.Category.find({where: {id: id}, attributes: ['id', 'name', 'heading', 'description', 'position']}).success(function(category) {
			return cb(category.selectedValues);
		});
	},

	updateCategory: function(category, cb) {
		var self = this;
		this.Category.findOrCreate({id: category.id}, _.omit(category, 'id')).success(function(cat, create) {
			if (!create) {
				cat.updateAttributes(_.omit(category, 'id')).success(function(){
					self.populateCategories();
					return cb(null, 'La gallerie a été mise à jour', cat);
				});
			} else {
				return cb(null, 'La gallerie a été créée', category);
			}
		});
	},

	deleteCategory: function(fields) {
		console.log(fields);
	},

	getCategories: function(cb) {
		var self = this;
		var ret = [];
		self.Category.findAll({attributes: ['id', 'name', 'heading', 'description', 'position']}).success(function(categories) {
			categories.forEach(function(cat) {
				ret.push(cat.selectedValues);
			});
			cb(ret);
		});
	},

	populateCategories: function(cb) {
		var self = this;
		this.getCategories(function(categories) {
			self.categories = categories;
			if (cb)
				cb();
		})
	},

	getImagesFromCategory: function(id, fileType, cb) {
		var self = this;
		this.Image.find({where: {id: id}}).success(function(images) {
			console.log(images.dataValues);
			cb({images: images.dataValues, path: self.config.imgdir+_.where(self.config.imgtypes, {name: fileType}).dir});
		});
	},

	getList: function(photosdir, listFiles, callback) {
		var aDir = ['/'];
		var dirNum = 0;
		var fileNum = 1000;
		var finder = findit.find(photosdir);
		var self = this;
		var objectStoreModel = [{id: 0, name: 'root', type: 'dir'}];
		findit.sync(photosdir, {}, function(found, stat) {
			if (stat.isDirectory()) {
				var tmp = found.split(path.sep).slice(photosdir.split(path.sep).length, this.length);
				var parent = 0;
				tmp.forEach(function(dir, idx) {
					if (aDir.indexOf(dir) == -1) {
						dirNum = aDir.length;
						aDir.push(dir);
						objectStoreModel.push({id: dirNum, name: dir, type: 'dir', path: found.replace(photosdir, ''), parent: parent});
					} else {
						parent = aDir.indexOf(dir);
					}
				});
			}
			if (listFiles && stat.isFile()) {
				var tmp = found.split(path.sep).slice(photosdir.split(path.sep).length, this.length);
				f = tmp.pop();
				d = tmp.pop();
				objectStoreModel.push({id: fileNum, name: f, type: 'file', path: found.replace(photosdir, ''), parent: aDir.indexOf(d), md5: crypto.createHash('md5').update(fs.readFileSync(found, 'binary')).digest('hex')});
				fileNum++;
			}
		});
		self.list = objectStoreModel;
	},

	processZip: function(file, filename, categoryId, socket, cb) {
		var self = this;
		var zip = new AdmZip(file);
		zipEntries = zip.getEntries();
		i = 0;
		zipEntries.forEach(function(zipEntry) {
			if (zipEntry.isDirectory == false) {
				var buffer = zip.readFile(zipEntry);
				self.processImage(buffer, zipEntry.entryName, categoryId, socket, function(err) {
					i++;
					console.log('Resize OK');
					if (i == zipEntries.length) {
						console.log('Unzip and resize ok');
						return cb(err);
					}
				});
			}
		});
	},

	processImage: function(buffer, filename, categoryId, socket, cb) {
		var md5 = crypto.createHash('md5').update(buffer).digest('hex')
		var m = md5.match(/^([a-z0-9]{1})([a-z0-9]{1})([a-z0-9]{1})([a-z0-9]*)/);
		var fileExt= filename.split('.').pop();
		var imgPath = path.normalize(m[1]+path.sep+m[2]+path.sep+m[3]+path.sep+m[4]+'.'+fileExt);
		var self = this;
		var filesDone = 0;
		var numFilesToProcess = this.config.imgtypes.length;
		// Builld thumb
		socket.emit('beginImageProcessing', {image: filename, hash: md5});
		this.config.imgtypes.forEach(function(imgtype) {
			var destDir = path.normalize(self.imgdir+path.sep+imgtype.dir+path.sep+m[1]+path.sep+m[2]+path.sep+m[3]);
			var destImg = destDir+path.sep+m[4]+'.'+fileExt;
			// Create directory if needed
			if (!fs.existsSync(destDir)) {
				mkdirp.sync(destDir)
			}
			gm(buffer, filename).resize(imgtype.width, imgtype.height).autoOrient().write(destImg, function(err) {
				if (err)
					return cb(err);
				if (filesDone == 0) {
					var toBeInserted = {name: filename, active: 1, path: imgPath};
					self.Image.findOrCreate({path: imgPath}, toBeInserted).success(function(img) {
						self.Category.find(categoryId).success(function(category) {
							img.addCategory(category);
						}).error(function(err) {
							return cb(err);
						});
					}).error(function(err) {
						return cb(err);
					});
				} 
				filesDone++;
				socket.emit('imageProcessing', {name: filename, hash: md5, percent: (filesDone*100/numFilesToProcess)});
				if (filesDone == numFilesToProcess) {
					return cb();
				}
			});
		});	
	},

	del: function(path, callback) {
	  if (!callback) return new Error("No callback passed to del()");
		// Hard coded to avoid bio hazard
		if (path.indexOf('Photos') == -1) {
			callback(new Error("No Photos/ in path, abording delete"));
		} else {
			//rimraf(path, callback;
			console.log('DELETE '+path);
		}
	}

}
