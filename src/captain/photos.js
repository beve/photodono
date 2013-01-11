var fs = require('fs');
var path = require('path');

var photos = module.exports = function photos() {
	this.path = '';
	this.photosList = {};
	this.cache = {};
};

photos.prototype = {

	find: function(dir, done) {
		var self = this;
		console.log('ici');
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
						// add file
						var current = self.photosList;
						if ((file.indexOf('_min') != -1) && (['.jpg', '.png', '.gif'].indexOf(path.extname(file).toLowerCase()) != -1)) {
							file.replace('public/Photos/', '').split(path.sep).forEach(function(element, index, array) {
								if (index < array.length-1) {
									if (!current[element]) {
										current[element] = {};
									}
									current = current[element];
								} else {
									if (!current['img']) {
										current['img'] = [];
									}
									console.log(element);
									current['img'].push(element);
								}

							});
							//self.photosList.push();
						}
						if (!--pending) done(null);
					}
				});
			});
		});
	}

};
