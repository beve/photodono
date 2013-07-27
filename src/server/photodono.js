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

	this.Image.hasMany(this.Category);
	this.Category.hasMany(this.Image);

	sequelize.sync({force: false}).success(function() {
		console.log('Database synchronized.')
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

	getCategory: function(id, args, cb) {
		var self = this;
		args = args || {};
		this.Category.find({where: {id: id}, attributes: ['id', 'name', 'heading', 'description', 'position', 'active']}).success(function(category) {
			category.getImages(args).success(function(images) {
				catObj = category.selectedValues;
				_.extend(catObj, {images:{files: images, path: self.config.imgdir+path.sep+_.where(self.config.imgtypes, {name: 'small'})[0].dir}});
				return cb(catObj);
			});
		});
	},

	updateCategory: function(category, cb) {
		var self = this;
		console.log(category);
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
			categories.forEach(function(category) {
				ret.push(category);
				/*
				category.getImages().success(function(images) {
					catObj = category.selectedValues;
					_.extend(catObj, {images:{files: images, path: self.config.imgdir+path.sep+_.where(self.config.imgtypes, {name: 'small'})[0].dir}});
					ret.push(catObj);
				});
				*/
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

	getImagesFromCategory: function(id, fileType, order, limit, cb) {
		var self = this;
		var args = {};
		if (order) args.order = order;
		if (limit) args.limit = limit;
		this.Category.find({where: {id: id}}).success(function(category) {
			category.getImages(args).success(function(images) {
				cb({images: images, path: self.config.imgdir+path.sep+_.where(self.config.imgtypes, {name: fileType})[0].dir});
			});
		});
	},

	processZip: function(file, categoryId, socket, cb) {
		socket.send('Décompression du Zip');
		var self = this;
		var zip = new AdmZip(file);
		zipEntries = zip.getEntries();
		i = 0;
		zipEntries.forEach(function(zipEntry) {
			if (zipEntry.isDirectory == false) {
				zip.readFileAsync(zipEntry, function(buffer) {
					self.processImage(buffer, zipEntry.entryName, categoryId, socket, function(err) {
						i++;
						if (i == zipEntries.length) {
							fs.unlink(file, function() {
								return cb(err);
							});
						}
					});
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
		var imgdir = __dirname+'..'+path.sep+'..'+path.sep+'..'+path.sep+path.normalize(this.config.staticdir)+path.sep+path.normalize(this.config.imgdir);
		// Builld thumb
		socket.send('Traitement des images et génération des miniatures');
		socket.emit('beginImageProcessing', {image: filename, hash: md5});
		this.config.imgtypes.forEach(function(imgtype) {
			var destDir = path.normalize(imgdir+path.sep+imgtype.dir+path.sep+m[1]+path.sep+m[2]+path.sep+m[3]);
			var destImg = destDir+path.sep+m[4]+'.'+fileExt;
			var crop = (imgtype.crop) ? '^' : '';
			// Create directory if needed
			if (!fs.existsSync(destDir)) {
				mkdirp.sync(destDir);
			}
			gm(buffer).resize(imgtype.width, imgtype.height+'>').thumbnail(imgtype.width, imgtype.height+crop).gravity('center').extent(imgtype.width, imgtype.height).write(destImg, function(err) {
				if (err) {
					console.log(err);
					return cb(err);
				}
				if (filesDone == 0) {
					var toBeInserted = {name: filename, active: 1, path: imgPath};
					self.Image.findOrCreate({path: imgPath}, toBeInserted).success(function(img) {
						self.Category.find(categoryId).success(function(category) {
							img.addCategory(category);
						}).error(function(err) {
							console.log(err);
							return cb(err);
						});
					}).error(function(err) {
						console.log(err);
						return cb(err);
					});
				} 
				filesDone++;
				socket.emit('imageProcessing', {name: filename, hash: md5, percent: (filesDone*100/numFilesToProcess)});
				if (filesDone == numFilesToProcess) {
					return cb(err);
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
