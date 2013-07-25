module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),
		
		watch: {
			files: ['src/sass/*.scss'],
			tasks: 'default'
		},
		compass: {
			dist: {
				options: {
					sassDir: 'src/sass',
					cssDir: 'public/css',
					javascriptsDir: 'public/js',
					imagesDir: 'public/img',
					fontsDir: 'public/fonts',
					app: 'stand_alone',
					outputStyle: 'compressed',
					environment: 'production'
				}
			},
			dev: {
				options: {
					sassDir: 'src/sass',
					cssDir: 'public/css',
					javascriptsDir: 'public/js',
					imagesDir: 'public/img',
					fontsDir: 'public/fonts',
					app: 'stand_alone',
					outputStyle: 'nested',
					environment: 'development'
				}
			}
		},
		dojo: {
			dist: {
				options: {
					dojo: 'src/dojo/dojo.js',
					load: 'build',
					profile: 'app.profile.js',
					cwd: './',
					basePath: ''
				}
			},
		}

	});
  	
  	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-compass');
	grunt.loadNpmTasks('grunt-dojo');

	grunt.registerTask('default', ['compass:dist']);
	grunt.registerTask('release', ['compass:dev']);

};
