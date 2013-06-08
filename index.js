var fs = require('fs');
var express = require('express');
var photosMod = require('./src/server/photodono');
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
var photos = new photosMod();
photos.getList(config.photosdir);
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

  app.post('/delete', function (req, res) {
    if (!req.body.files) throw new Error('No files provided');
    files = (!util.isArray(req.body.files)) ? [req.body.files] : req.body.files;
    files.forEach(function(file) {
      photos.del(path.normalize(config.photosdir+path.sep+file), function(err) {
       photos.getList(config.photosdir);
       res.json(true, err);
     });
    });
  });

  app.post('/rename', function (req, res) {
    if (!req.body.from || !req.body.to) throw new Error('No Path provided');
    fs.rename(path.normalize(config.photosdir+path.sep+req.body.from), path.normalize(config.photosdir+path.sep+path.dirname(req.body.from)+path.sep+req.body.to), function(err) {
      var error = err || {};
      photos.getList(config.photosdir);
      res.json(true, err);
    });
  });

  app.post('/newdirectory', function (req, res) {
    if (!req.body.dir) throw new Error('No directory name provided');
    fs.mkdir(config.photosdir+path.sep+req.body.dir, function(err) {
      var error = err || {};
      photos.getList(config.photosdir);
      res.json(true, err);
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

    var files = photos.unzip(zip.path, __dirname+path.sep+config.tmpdir);
    fs.unlinkSync(zip.path);

    var thumbs = photos.buildThumbnail(files, __dirname+path.sep+config.tmpdir, __dirname+path.sep+config.photosdir, config.thumb.w, config.thumb.h, '_min', function(err, files) {
      if (!err) {
        photos.getList(config.photosdir, function(err) {
          if (!err) {
            res.redirect('/admin');
          }
        });
      }
    });

    var images = photos.buildThumbnail(files, __dirname+path.sep+config.tmpdir, __dirname+path.sep+config.photosdir, config.photo.w, config.photo.h, '');

  });

  // Start server
  app.listen(config.server.port);
  console.log('Server ready');
}
