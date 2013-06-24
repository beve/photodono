var fs = require('fs');
var express = require('express');
var photodono = require('./src/server/photodono');
var app = express();
var path = require('path');
var util = require('util');
var _ = require('underscore');

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

// Init photodono
var photodono = new photodono(config);
// Store sockets
var sockets = {};
// Init express
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
		app.use(express.bodyParser({uploadDir: __dirname+path.sep+config.tmpdir}));
		app.use(express.methodOverride());
		app.use(express.cookieParser(config.secret));
		app.use(express.static(config.staticdir));
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

	app.get('/category/:id', function(req, res) {
		if (req.params.id) {
			photodono.getCategory(req.params.id, {}, function(category) {
				res.render('admin/category', category, function(err, content) {
					res.json({content: content, images: category.images});
				});
			});
		}
	});

	app.get('/category', function(req, res) {
		res.render('admin/category', {name: '', heading: '', desc: '', position: 0}, function(err, content) {
			res.json({content: content});
		});
	});

	app.post('/category', function(req, res) {
		photodono.updateCategory(req.body, function(err, msg, returnedCategory) {
			if (!err)
				res.json({err: err, msg: msg, category: returnedCategory});
		});
	});

	app.get('/categories', function(req, res) {
		res.json(photodono.categories);
	});

	app.get('/thumbnails', function(req, res) {
		console.log(req.query);
		order = req.query.order || null;
		limit = req.query.limit || null;
		res.json(photodono.getImagesFromCategory(req.query.categoryId, 'thumb', order, limit, function(thumbs) {
			res.json(thumbs);
		}));
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

	app.post('/upload', function(req, res) {

		var acceptedImgTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
		var filesDone = 0;
		var socket = sockets[req.body.socketId];

		if (!req.files.uploadedFiles) {
			res.json({err: 'No file provided'});
			return;
		}
		if (typeof(req.files.uploadedFiles[0][0]) == 'object') {
			var ulf = req.files.uploadedFiles[0];
		} else {
			var ulf = req.files.uploadedFiles;
		}
		socket.send('Traitement des images');
		ulf.forEach(function(f) {
			if (f.size === 0) {
				res.json({err: 'File is empty'});
			}
			if (f.type == 'application/zip') {
				var files = photodono.processZip(f.path, req.body.categoryId, socket, function(err) {
					filesDone += 1;
					if (ulf.length  == filesDone) {
						photodono.getImagesFromCategory(req.body.categoryId, 'thumb', null, null, function(ret) {
							return res.json(ret);
						});
					}
				});
			}
			if (acceptedImgTypes.indexOf(f.type) != -1) {
				photodono.processImage(fs.readFileSync(f.path), f.name, req.body.categoryId, socket, function(err) {
					filesDone += 1;
					if (ulf.length  == filesDone) {
						photodono.getImagesFromCategory([req.body.categoryId], 'thumb', null, null, function(ret) {
							return res.json(ret);
						});
					}
					// Delete Image
					fs.unlinkSync(f.path);
				});
			}
		});

	});

	// Start server
	var server = app.listen(config.server.port);
	var io = require('socket.io').listen(server);
	io.sockets.on('connection', function (socket) {
		socket.emit('connected', socket.id);
		sockets[socket.id] = socket;
		console.log('A socket connected: '+socket.id);
		socket.on('disconnect', function () {
			delete sockets[socket.id];
		});
	});
	console.log('Server ready');
}
