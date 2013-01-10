var fs = require('fs');
var path = require('path');

var photos = module.exports = function photos() {
	this.path = '';
	this.photosList = null;
	this.cache = {};
};

photos.prototype = {

	find: function(dir, done) {
		var self = this;
		var results = [];
		fs.readdir(dir, function(err, list) {
			if (err) return done(err);
			var pending = list.length;
			if (!pending) return done(null, results);
			list.forEach(function(file) {
				file = dir + '/' + file;
				fs.stat(file, function(err, stat) {
					if (stat && stat.isDirectory()) {
						self.find(file, function(err, res) {
							results = results.concat(res);
							if (!--pending) done(null, results);
						});
					} else {
						if ((file.indexOf('_min') != -1) && (['.jpg', '.png', '.gif'].indexOf(path.extname(file).toLowerCase()) != -1)) {
							results.push(file.replace('public/', ''));
						}
						if (!--pending) done(null, results);
					}
				});
			});
		});
	}

};
