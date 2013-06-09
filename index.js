var fs = require('fs');
var express = require('express');
var photodono = require('./src/server/photodono');
var app = express();
var path = require('path');
var util = require('util');

// Config
var configFile = 'config/config.json';
var config;
if (!fs.existsSync(configFile)) {
	console.error('Config file '+configFile+' not found. Please create it from config.js.distfile');
	process.exit(1);
} else {
	try {
		config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
	} catch (e) {
		console.error('Malformed config file: '+e.message);
		process.exit(1);
	}
}

// Get photos list
var photodono = new photodono();

// Register root category if not exists
photodono.getCategories(function(err) {
	if (err) {
		console.log('Error retrieving categories');
		process.exit(1);
	}
	if (photodono.categories.length == 0) {
		photodono.createCategory({id: 0, name: 'root', type: 'dir', parent: null, path: '/', pos: 0, active: 1, desc: ''}, function(err, msg) {
			if (err) {
					console.log('Category creation error: '+err);
					process.exit(1);
			}
			photodono.getCategories();
		});
	}
});

//photodono.getList(config.photosdir, false);
initExpress();

// Plug real authentification
function authenticate(login, passwd, callback) {
	if (login == 'admin' && passwd == config.pass) {
		callback(null, true);
	} else {
		return callback(new Error("login failed"));
	}
}

function restrict(req, res, next) {
	if (req.session.isAuthenticated) {
		next();
	} else {
		req.session.error = 'Access denied!';
		res.redirect('/login');
	}
}

function initExpress() {
	app.configure(function(){
		app.set('views', 'views');
		app.set('view engine', 'jade');
		app.use(express.favicon('public/img/favicon.ico'));
		app.use(express.bodyParser({uploadDir: __dirname+'/tmp' }));
		app.use(express.methodOverride());
		app.use(express.cookieParser(config.secret));
		app.use(express.static('public'));
		app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
		app.use(express.session());
		app.use(app.router);
	});

	app.get('/', function(req, res) {
		res.render('index', {});
	});

	app.get('/getList', function(req, res) {
		res.json(photodono.getList());
	});
	
	app.get('/admin', function(req, res) {
		res.render('admin/index', {});
	});

	app.get('/category/:name', function(req, res) {
		if (req.params.name) {
			photodono.getCategory(req.params.name, function(datas) {
				res.render('admin/category', {}, function(err, content) {
					res.json({content: content, datas: datas});
				});
			});
		}
	});

	app.get('/categories', function(req, res) {
		res.json(photodono.categories);
	});

	app.put('/categories', function(req, res) {

	});

	app.post('/categories', function(req, res) {

	});

	app.get('/login', function(req, res) {
		res.render('login', {error: req.session.error});
	});

	app.get('/logout', function (req, res) {
		req.session.destroy(function() {
			res.redirect('/');
		});
	});

	app.post('/login', function(req, res) {
		authenticate(req.body.login, req.body.passwd, function(err, isAuthenticated) {
			if (err) {
				req.session.error = 'Bad login';
				res.redirect('login');
			} else {
				delete req.session.error;
				req.session.isAuthenticated = isAuthenticated;
				res.redirect('/admin');
			}
		});
	});

	app.post('/delete', function (req, res) {
		if (!req.body.files) throw new Error('No files provided');
		files = (!util.isArray(req.body.files)) ? [req.body.files] : req.body.files;
		files.forEach(function(file) {
			photodono.del(path.normalize(config.photosdir+path.sep+file), function(err) {
				res.json(true, err);
			});
		});
	});

	app.post('/rename', function (req, res) {
		if (!req.body.from || !req.body.to) throw new Error('No Path provided');
		fs.rename(path.normalize(config.photosdir+path.sep+req.body.from), path.normalize(config.photosdir+path.sep+path.dirname(req.body.from)+path.sep+req.body.to), function(err) {
			var error = err || {};
			res.json(true, err);
		});
	});

	app.post('/newdirectory', function (req, res) {
		if (!req.body.dir) throw new Error('No directory name provided');
		fs.mkdir(config.photosdir+path.sep+req.body.dir, function(err) {
			var error = err || {};
			res.json(true, err);
		});
	});

	app.post('/upload', function(req, res) {

		var acceptedImgTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
		var filesDone = 0;

		if (!req.body.name) {
			res.json({err: 'No name for this category'});
		}

		if (!req.files.uploadedFiles) {
			res.json({err: 'No file provided'});
		}

		req.files.uploadedFiles.forEach(function(f) {
			if (f.size === 0) {
				res.json({err: 'File is empty'});
			}
			if (f.type == 'application/zip') {
				var files = photodono.processZip(f.path, req.body.name, __dirname+path.sep+config.tmpdir, function(err) {
					filesDone += 1;
					if (req.files.uploadedFiles.length  == fildesDone) {
						res.json(photodono.getImages(req.body.name));
					}
				});
			}
			if (acceptedImgTypes.indexOf(f.type) != -1) {
				photodono.processImage(f.path, req.body.name, __dirname+path.sep+config.tmpdir, function(err) {
					filesDone += 1;
					if (req.files.uploadedFiles.length  == fildesDone) {
						res.json(photodono.getImages(req.body.name));
					}
				});
			}
		});

	});

	// Start server
	app.listen(config.server.port);
	console.log('Server ready');
}
