var fs = require('fs');
var path = require('path');
var zipfile = require('zipfile');
var gm = require('gm');
var mkdirp = require('mkdirp');

var photos = module.exports = function photos() {
	this.list = {};
};

photos.prototype = {

	find: function(dir, callback) {
		var self = this;
		var result = [];
		fs.readdir(dir, function(err, fList) {
			var pending = fList.length;
			if (!pending) return callback(null, result);
			fList.sort().forEach(function(file) {
				file = dir + '/' + file;
				fs.stat(file, function(err, stat) {
					if (stat && stat.isDirectory()) {
						self.find(file, function(err, res) {
							result = result.concat(res);
							if (!--pending) callback(null, result);
						});
					} else {
						result.push(file);
						if (!--pending) callback(null, result);
					}
				});
			});
		});
	},

	findSync: function(dir, callback) {
		var self = this;
		var result = [];
		var fList = fs.readdirSync(dir);
		var pending = fList.length;
		if (!pending) return callback(null, result);
		fList.sort().forEach(function(file) {
			file = dir + '/' + file;
			var stat = fs.statSync(file);
			if (stat && stat.isDirectory()) {
				self.findSync(file, function(err, res) {
					result = result.concat(res);
					if (!--pending) callback(null, result);
				});
			} else {
				result.push(file);
				if (!--pending) callback(null, result);
			}
		});
	},

	populateFileListOld: function(dir, callback) {
		var self = this;
		this.findSync(dir, function(err, result) {
			if (err) callback(err);
			result.forEach(function(file, index, array) {
				var current = self.list;
				if ((file.indexOf('_min') != -1) && (['.jpg', '.png', '.gif'].indexOf(path.extname(file).toLowerCase()) != -1)) {
					file.replace(dir, '').split(path.sep).forEach(function(element, index, array) {
						if (index < array.length-1) {
							if (!current[element]) current[element] = {};
							current = current[element];
						} else {
							if (!current['files']) current['files'] = [];
							current['files'].push(element);
						}
					});
				}
			});
			callback(null);
		});
	},

	populateFileList: function(photosdir, callback) {
		var self = this;
		var objectStoreModel = [{id: '/', name: 'Root', type: 'dir'}];
		var aDir = ['/'];
		this.findSync(photosdir, function(err, result) {
			if (err) callback(err);
			result.forEach(function(file, index, array) {
				file = file.replace(photosdir, '');
				if ((file.indexOf('_min') == -1) && (['.jpg', '.png', '.gif'].indexOf(path.extname(file).toLowerCase()) != -1)) {
					var photo = path.basename(file);
					var filepath = path.dirname(file);
					var tmp = path.dirname(file).split(path.sep);
					var dirParent = (tmp[tmp.length-2] !== '') ? tmp[tmp.length-2] : '/';
					var fileParent = (tmp[tmp.length-1] !== '') ? tmp[tmp.length-1] : '/';
					if (aDir.indexOf(filepath) == -1) {
						tmp.forEach(function(d, i) {
							if (i == 1) {
								if (aDir.indexOf(d) == -1) {
									objectStoreModel.push({id: d, name: d, type: 'dir', path: filepath.replace(path.sep+d, ''), parent: '/'});
									aDir.push(d);
								}
							} else if (i > 1) {
								if (aDir.indexOf(d) == -1) {
									objectStoreModel.push({id: d, name: d, type: 'dir', path: filepath.replace(path.sep+d, ''), parent: tmp[i-1]});
									aDir.push(d);
								}
							}
						});
					}
					objectStoreModel.push({id: index, name: photo, type: 'file', path: filepath, parent: fileParent});
				}
			});
			self.list = objectStoreModel;
			callback(null);
		});
	},

	unzip: function(file, root) {
		var files = [];
		root = path.normalize(root);
		var zip = new zipfile.ZipFile(file);
		for(i=0; i< zip.count; i++) {
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
		}
		return files;
	},

	buildThumbnail: function(fileList, tmpdir, destdir, w, h, s) {
		var suffix = s || '';
		var files = [];
		tmpdir = path.normalize(tmpdir);
		destdir = path.normalize(destdir);
		fileList.forEach(function(orig) {
			original = tmpdir+orig;
			var dir = destdir+path.dirname(orig);
			var filename = dir+path.sep+path.basename(orig, path.extname(orig))+suffix+path.extname(orig);
			console.log(filename);
			if (!fs.existsSync(dir)) {
				mkdirp.sync(dir, 0755);
			}
			gm(original).resize(w, h).write(filename, function(err) {
				if (err) console.log(err);
				else files.push(filename);
			});
		});
		return files;
	}

}
