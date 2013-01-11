var fs = require('fs');
var path = require('path');

var photos = module.exports = function photos() {
	this.list = {};
};

photos.prototype = {

	find: function(dir, done) {
		var self = this;
		fs.readdir(dir, function(err, fList) {
			var pending = fList.length;
			if (!pending) return done(null);
			fList.sort().forEach(function(file) {
				file = dir + '/' + file;
				fs.stat(file, function(err, stat) {
					if (stat && stat.isDirectory()) {
						self.find(file, function(err, res) {
							if (!--pending) done(null);
						});
					} else {
						self.populateFileList(file);
						if (!--pending) done(null);
					}
				});
			});
		});
	},

	populateFileList: function(file) {
		var current = this.list;
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
	}

};
