var fs = require('fs');
var path = require('path');
var unzip = require('unzip');
var fstream = require('fstream');
var zipfile = require('zipfile');

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

	populateFileList: function(dir, callback) {
		var self = this;
		this.findSync(dir, function(err, result) {
			if (err) callback(err);
			result.forEach(function(file, index, array) {
				var current = self.list;
				if ((file.indexOf('_min') != -1) && (['.jpg', '.png', '.gif'].indexOf(path.extname(file).toLowerCase()) != -1)) {
					file.replace('public/Photos/', '').split(path.sep).forEach(function(element, index, array) {
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

	unzip: function(file, root) {
		//var zip = new admZip(file);
		var zip = new zipfile.ZipFile('/home/beve/test/gfd.zip');
		for(i=0; i< zip.count; i++) {
			var dir = path.basename(zip.names[i]);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, 0755);
			}
			if(['.jpg', '.png', '.gif'].indexOf(path.extname(zip.names[i]).toLowerCase()) != -1) {
				console.log(zip.names[i]);
				fs.writeFileSync(zip.names[i], zip.readFileSync(zip.names[i]));
			}
		}
		/*
		var writeStream;
		fs.createReadStream(file)
		.pipe(unzip.Parse())
		.on('error', function(err) {
			console.log(err);
		})
		.on('entry', function (entry) {
			if (entry.type == 'Directory' && !fs.existsSync(entry.path)) {
				//fs.mkdirSync(root+'/'+entry.path);
			} else if (entry.type == 'File') {
				writeStream = fstream.Writer(root+'/'+entry.path);
				console.log(entry._writableState);
				writeStream.write('toto');
			}
		});
*/
	}

}
