module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
      compass: {
    dist: {
      options: {
        sassDir: 'src/sass',
        cssDir: 'public/css',
        javascriptsDir: 'public/js',
        imagesDir: 'public/img',
        fontsDir: 'public/fonts',
        app: 'stand_alone',
        environment: 'production'
      }
    },
    dev: {
      options: {
        sassDir: 'src/sass',
        cssDir: 'public/css',
      }
    }
  }
});


  grunt.loadNpmTasks('grunt-contrib-compass');

  grunt.registerTask('default', ['compass']);

};
