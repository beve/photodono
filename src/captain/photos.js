var fs = require('fs');
var path = require('path');

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

	populateFileList: function(dir, callback) {
		var self = this;
		this.find(dir, function(err, result) {
			if (err) throw err;
			result.forEach(function(file, index, array) {
				var current = self.list;
				if ((file.indexOf('_min') != -1) && (['.jpg', '.png', '.gif'].indexOf(path.extname(file).toLowerCase()) != -1)) {
					file.replace('public/Photos/', '').split(path.sep).forEach(function(element, index, array) {
						if (index < array.length-1) {
							if (!current[element]) current[element] = {};
							current = current[element];
						} else {
							if (!current['img']) current['img'] = [];
							current['img'].push(element);
						}
					});
				}
			});
			callback(null);
		});
	}

};
