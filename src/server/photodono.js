var fs = require('fs');
var path = require('path');
var AdmZip = require('adm-zip');
var gm = require('gm');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var findit = require('findit');
var crypto = require('crypto');
var redis = require('redis'),
      client = redis.createClient();

client.on("error", function (err) {
	console.log("Error " + err);
});

 var photodono = module.exports = function photodono() {
	this.categories = [];
};

photodono.prototype = {

	createCategory: function(fields, cb) {
		client.zadd('categories', fields.pos, 'category:'+fields.name, function(err, msg) {
			if (err) return cb(err);
			client.hmset('category:'+fields.name, 'name', fields.name, 'type', fields.type, 'parent', fields.parent, 'path', fields.path, 'desc', fields.desc, 'active', fields.active, 'id', fields.id, function(err, msg) {
				return cb(err, msg);
			});
		});
	},

	getCategory: function(name, cb) {
		client.hgetall('category:'+name, function(err, res) {
			cb(res);
		});
	},

	updateCategory: function(fields) {
		console.log(fields);
	},

	deleteCategory: function(fields) {
		console.log(fields);
	},

	getCategories: function(cb) {
		var self = this;
		client.zrange('categories', 0, -1, function(err, replies) {
			if (replies.length == 0) {
				if (cb)
					cb(err);
				return;
			}
			replies.forEach(function(reply, num) {
				client.hgetall(reply, function(err, hash) {
					if (hash) {
						self.categories.push(hash);
					}
					if (cb && replies.length == num+1) {
						cb(err);
					}
				});
			})
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

	processZip: function(file, categoryName, destDir, cb) {
		var self = this;
		destDir = path.normalize(destDir);
		var zip = new AdmZip(file);
		zipEntries = zip.getEntries();
		i = 0;
		zipEntries.forEach(function(zipEntry) {
			if (zipEntry.isDirectory == false) {
				var buffer = zip.readFile(zipEntry);
				self.processImage(buffer, categoryName, zipEntry.entryName, destDir, function(img) {
					i++;
					console.log('Resize OK');
					if (i == zipEntries.length) {
						console.log('Unzip and resize ok');
					}
				});
			}
		});
	},

	processImage: function(buffer, categoryName, destDir, cb) {
		var md5 = crypto.createHash('md5').update(buffer).digest('hex')
		var m = md5.match(/^([a-z0-9]{1})([a-z0-9]{1})([a-z0-9]{1})([a-z0-9]*)/);
		var destDir = destDir+path.sep+m[1]+path.sep+m[2]+path.sep+m[3];
		var self = this;
		// Builld thumb
		this.buildThumbnail(buffer, destDir, m[4], 200, 200, function(err) {
			if (err) {
				console.log(err);
				cb(err);
				return;
			}
			// Build Fullsize
			self.buildThumbnail(buffer, destDir, m[4], 800,800, function(err) {
				if (err) {
					console.log(err);
					cb(err);
					return;
				}
				// Save images infos with Redis
				console.log('Name :'+categoryName);
				//client.sadd('category:'+categoryName, md5);
			})
		});
	},

	buildThumbnail: function(buffer, destDir, destFile, w, h, cb) {
		if (!fs.existsSync(destDir)) {
			mkdirp.sync(destDir)
		}
		gm(buffer).resize(w, h).write(destDir+path.sep+destFile, function(err) {
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
