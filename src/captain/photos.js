var fs = require('fs');
var path = require('path');

var photos = module.exports = function photos() {
	this.path = '';
	this.photosList = {'photos': [], 'hierarchy': []};
	this.cache = {};
};

photos.prototype = {

	find: function(dir, done) {
		var self = this;
		fs.readdir(dir, function(err, list) {
			if (err) return done(err);
			var pending = list.length;
			if (!pending) return done(null);
			list.forEach(function(file) {
				file = dir + '/' + file;
				fs.stat(file, function(err, stat) {
					if (stat && stat.isDirectory()) {
						self.find(file, function(err, res) {
							if (!--pending) done(null);
						});
					} else {
						if ((file.indexOf('_min') != -1) && (['.jpg', '.png', '.gif'].indexOf(path.extname(file).toLowerCase()) != -1)) {
							self.photosList.photos.push(file.replace('public/', ''));
						}
						if (!--pending) done(null);
					}
				});
			});
		});
	}

};
