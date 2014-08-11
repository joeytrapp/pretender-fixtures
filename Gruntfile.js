module.exports = function(grunt) {
  grunt.initConfig({
    browserify: {
      qs: {
        src: 'lib/qs.js',
        dest: 'vendor/qs.js'
      }
    },

    concat: {
      build: {
        src: [
          'vendor/qs.js',
          'bower_components/FakeXMLHttpRequest/fake_xml_http_request.js',
          'bower_components/route-recognizer/dist/route-recognizer.js',
          'bower_components/pretender/pretender.js',
          'lib/agent.js'
        ],
        dest: 'dist/agent.js'
      }
    },

    connect: {
      server: {
        options: {
          port: 3000
        }
      }
    },

    jshint: {
      options: {},
      all: ['lib/agent.js']
    },

    qunit: {
      all: {
        options: {
          urls: ['http://localhost:3000/test/index.html']
        }
      }
    },

    watch: {
      test: {
        files: ['test/**/*.js', 'lib/**/*.js'],
        tasks: ['build', 'jshint:all', 'qunit:all']
      },
      lint: {
        files: ['test/**/*.js', 'lib/**/*.js'],
        tasks: ['build', 'jshint:all']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('build', ['browserify:qs', 'concat:build']);
  grunt.registerTask('test', ['build', 'connect:server', 'jshint:all', 'qunit:all']);
  grunt.registerTask('autotest', ['build', 'connect:server', 'jshint:all', 'qunit:all', 'watch:test']);
  grunt.registerTask('server', ['build', 'connect:server', 'watch:lint']);
  grunt.registerTask('default', ['test']);
};

