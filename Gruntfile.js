function GruntTasks (grunt) {
	'use strict';

	grunt.initConfig({
		jsonlint: {
			pkg: {
				src: 'package.json'
			},
			jshint: {
				src: '.jshintrc'
			},
			jscsrc: {
				src: '.jscsrc'
			}
		},
		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			src: [
				'src/**/*.js',
				'test/**/*.js',
				'!test/coverage/**',
				'Gruntfile.js'
			]
		},
		jscs: {
			src: [
				'src/**/*.js',
				'test/**/*.js',
				'!test/coverage/**',
				'Gruntfile.js'
			]
		},
		clean: {
			coverage: [
				'test/coverage'
			]
		},
		instrument: {
			files: [
				'src/**/*.js'
			],
			options: {
				basePath: 'test/coverage/instrument/',
				lazy: false
			}
		},
		mochaTest: {
			test: {
				options: {
					reporter: 'spec',
					timeout: 2000
				},
				src: [
					'test/test.js'
				]
			}
		},
		storeCoverage: {
			options: {
				dir: 'test/coverage/reports'
			}
		},
		makeReport: {
			src: 'test/coverage/reports/**/*.json',
			options: {
				type: 'lcov',
				dir: 'test/coverage/reports',
				print: 'detail'
			}
		}
	});

	require('load-grunt-tasks')(grunt);

	grunt.registerTask('verify', [
		'jsonlint',
		'jshint',
		'jscs'
	]);

	grunt.registerTask('test', [
		'clean:coverage',
		'instrument',
		'mochaTest',
		'storeCoverage',
		'makeReport'
	]);

	grunt.registerTask('ci', [
		'verify',
		'test'
	]);
}

module.exports = GruntTasks;
