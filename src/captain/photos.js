define([
		"dojo/node!fs",
		"dojo/node!path",
		"dojo/_base/array",
		"dojo/_base/declare"
	],
	function(fs, path, array, declare) {
		var photos = declare(null, {});

		photos.find = function(dir, done) {
			var results = [];
			fs.readdir(dir, function(err, list) {
				if (err) return done(err);
				var pending = list.length;
				if (!pending) return done(null, results);
				list.forEach(function(file) {
					file = dir + '/' + file;
					fs.stat(file, function(err, stat) {
						if (stat && stat.isDirectory()) {
							photos.find(file, function(err, res) {
								results = results.concat(res);
								if (!--pending) done(null, results);
							});
						} else {
							if ((file.indexOf('_min') != -1) && array.indexOf(['jpg', 'png', 'gif'], path.extname(file).toLowerCase())) {
								results.push(file.replace('public/', ''));
							}
							if (!--pending) done(null, results);
						}
					});
				});
			});
		}

		return photos;
	}
);
