module.exports = function(grunt) {
  grunt.initConfig({
    concat: {
      build: {
        src: [
          'bower_components/FakeXMLHttpRequest/fake_xml_http_request.js',
          'bower_components/route-recognizer/dist/route-recognizer.js',
          'bower_components/pretender/pretender.js',
          'lib/agent.js'
        ],
        dest: 'dist/agent.js'
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.registerTask('default', ['concat:build']);
};
