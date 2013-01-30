var fs = require('fs');
var stylus = require('stylus');
var express = require('express');
var photosMod = require('./src/server/photos');
var app = express();

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
var photos = new photosMod();
photos.populateFileList('public/Photos', function(err) {
  if (err) throw err;
  initExpress();
});

function compile(str, path){
  return stylus(str).
  set("filename", path).
  use(nib());
}

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
    app.use(stylus.middleware({
      src: 'views',
      dest: 'public',
      compile: compile,
      compress: true
    }));
  });

  app.get('/', function(req, res) {
    res.render('index', {});
  });

  app.get('/photos', function(req, res) {
     res.json(photos.list);
  });
	
	app.get('/admin', function(req, res) {
    res.render('admin', {});
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

	app.post('/upload', function(req, res, callback) {
    if (!req.files.photoszip) {
      return callback(new Error('no file provided'));
    }
    var zip = req.files.photoszip;

    if (zip.type != 'application/zip') {
      return callback(new Error('It is not a valid zip file'));
    }

    if (zip.size === 0) {
      return callback(new Error('File is empty'));
    }
    var files = photos.unzip(zip.path, __dirname+'/tmp');
    photos.buildThumbnail(files);
	});

  // Start server
  app.listen(config.server.port);
  console.log('Server ready');
}
