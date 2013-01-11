var fs = require('fs');
var stylus = require('stylus');
var express = require('express');
var photosMod = require('./src/captain/photos');
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

function initExpress() {
  app.configure(function(){
    app.set('views', 'views');
    app.set('view engine', 'jade');
    app.use(express.favicon('public/img/favicon.ico'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser(config.secret));
    app.use(express.static('public'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
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

  // Start server
  app.listen(config.server.port);
  console.log('Server ready');
}
