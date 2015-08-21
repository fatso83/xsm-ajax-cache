module.exports = function (grunt) {

	grunt.initConfig({
		browserify: {
			build: {
				src: 'test/test.js',
				dest: 'test/test.bundle.js'
			}
		}
	})

	grunt.loadNpmTasks('grunt-browserify')

	grunt.registerTask('default', ['browserify'])
}