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
	var self = this;

	// Connect to database
	var sequelize = new Sequelize(config.database.database, config.database.user, config.database.password, {
		host: config.database.host,
		port: config.database.port,
		dialect: config.database.protocol
	});

	this.Category = sequelize.define('Category', {
		name: { type: Sequelize.STRING, allowNull: false},
		heading: Sequelize.TEXT,
		description: Sequelize.TEXT,
		position: Sequelize.INTEGER,
		parent: Sequelize.INTEGER
	})

	this.Image = sequelize.define('Image', {
		name: { type: Sequelize.STRING, allowNull: false},
		description: Sequelize.TEXT,
		hash: { type: Sequelize.STRING(32)},
		default: Sequelize.BOOLEAN
	})

	this.Image.hasMany(this.Category);
	this.Category.hasMany(this.Image);

	sequelize.sync().success(function() {
		console.log('Database sync ok.')
		// Check if root category exists or create it
		self.Category.findOrCreate({id: 1}, {name: 'root', description: 'Top level category', position: 0}).success(function(category, created) {
			if (created) {
				console.log('Top level category created.');
			}
			// Populate categories
			self.populateCategories();
		});
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
					return cb(null, 'La gallerie a été mise à jour');
				});
			} else {
				return cb(null, 'La  a été créée')
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

	getImagesFromCategory: function(id, cb) {
		Category.getImages().success(function(images) {
			cb(images);
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

	processZip: function(file, categoryName, filename, cb) {
		var self = this;
		var zip = new AdmZip(file);
		zipEntries = zip.getEntries();
		i = 0;
		zipEntries.forEach(function(zipEntry) {
			if (zipEntry.isDirectory == false) {
				var buffer = zip.readFile(zipEntry);
				self.processImage(buffer, categoryName, zipEntry.entryName, function(img) {
					i++;
					console.log('Resize OK');
					if (i == zipEntries.length) {
						console.log('Unzip and resize ok');
					}
				});
			}
		});
	},

	processImage: function(buffer, categoryName, filename, cb) {
		var md5 = crypto.createHash('md5').update(buffer).digest('hex')
		var m = md5.match(/^([a-z0-9]{1})([a-z0-9]{1})([a-z0-9]{1})([a-z0-9]*)/);
		var destDir = __dirname+'..'+path.sep+'..'+path.sep+path.normalize(this.config.photos.tmpdir)+path.sep+m[1]+path.sep+m[2]+path.sep+m[3];
		console.log(destDir);
		var self = this;
		// Builld thumb
		this.buildThumbnail(buffer, filename, destDir, m[4], config.thumb.w, config.thumb.h, function(err) {
			if (err) {
				console.log(err);
				cb(err);
				return;
			}
			// Build Fullsize
			self.buildThumbnail(buffer, filename, destDir, m[4], config.photo.w,config.photo.h, function(err) {
				if (err) {
					console.log(err);
					cb(err);
					return;
				}
				// Save images infos with Redis
			})
		});
	},

	buildThumbnail: function(buffer, filename, destDir, destFile, w, h, cb) {
		if (!fs.existsSync(destDir)) {
			mkdirp.sync(destDir)
		}
		gm(buffer, filename).resize(w, h).write(destDir+path.sep+destFile, function(err) {
				return cb(err);
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
