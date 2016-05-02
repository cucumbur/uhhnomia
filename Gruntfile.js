module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt); // npm install --save-dev load-grunt-tasks

  grunt.initConfig({
  	sass: {
  		options: {
  			sourceMap: true
  		},
  		dist: {
  			files: {
  				'assets/css/main.css': 'assets/css/main.scss',
          'assets/css/modals.css': 'assets/css/modals.scss'
  			}
  		}
  	}
  });

  grunt.registerTask('default', ['sass']);
};
