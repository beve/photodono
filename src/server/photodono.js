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

	unzip: function(file, root) {
		var files = [];
		root = path.normalize(root);
		var zip = new AdmZip(file);
		var zipEntries = zip.getEntries();
		zipEntries.forEach(function(zipEntry) {
			 console.log(zipEntry.toString());
		});
		/*
			var dir = root+path.sep+path.dirname(zip.names[i]);
			if (zip.names[i].split(path.sep)[0] != '__MACOSX') {
				if(['.jpg', '.png', '.gif'].indexOf(path.extname(zip.names[i]).toLowerCase()) != -1) {
					if (!fs.existsSync(dir)) {
						mkdirp.sync(dir, 0755);
					}
					files.push(path.sep+zip.names[i]);
					fs.writeFileSync(root+path.sep+zip.names[i], zip.readFileSync(zip.names[i]));
				}
			}
		*/
		return files;
	},

	buildThumbnail: function(fileList, tmpdir, destdir, w, h, s, callback) {
		var suffix = s || '';
		var files = [];
		var done = 0;
		tmpdir = path.normalize(tmpdir);
		destdir = path.normalize(destdir);
		fileList.forEach(function(orig) {
			original = tmpdir+orig;
			var dir = destdir+path.dirname(orig);
			var filename = dir+path.sep+path.basename(orig, path.extname(orig))+suffix+path.extname(orig);
			if (!fs.existsSync(dir)) {
				mkdirp.sync(dir, 0755);
			}
			gm(original).resize(w, h).write(filename, function(err) {
				if (!err) {
					files.push(filename);
					if (fileList.length == files.length && callback) {
						return callback(null, files);
					}
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
