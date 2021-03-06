module.exports = function(grunt) {

    "use strict";
    require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        watch: {
            js: {
                files: [
                    'lib/js/**/*.js'
                ],
                tasks: ['compile'],
            },
            html: {
                files: [
                    'lib/html/**/*.html'
                ],
                tasks: ['compile'],
            }
        },
        ngtemplates: {
            'fluro.access': {
                cwd: './lib/html',
                src: 'fluro/**/*.html',
                dest: 'dist/fluro.access-templates.js',
                options: {
                    htmlmin: {
                        collapseBooleanAttributes: true,
                        collapseWhitespace: true,
                        removeAttributeQuotes: true,
                        removeComments: true, // Only if you don't use comment directives! 
                        removeEmptyAttributes: true,
                        removeRedundantAttributes: true,
                        removeScriptTypeAttributes: true,
                        removeStyleLinkTypeAttributes: true
                    }
                }
            }
        },

        ngAnnotate: {
            options: {
                singleQuotes: true
            },
            app: {
                files: {
                    'dist/fluro.access.js': ['dist/fluro.access.js'],
                }
            }
        },


        //Concatenate all the build js files
        concat: {
            js: {
                src: ['lib/js/**/*.js'],
                dest: 'dist/fluro.access.js',
            }
        },
        uglify: {
            options: {
                mangle: true,
                compress:true,
            },
            build: {
                src: [
                    'dist/fluro.access.js',
                    'dist/fluro.access-templates.js'
                ],
                dest: 'dist/fluro.access.min.js'
            }
        }
    });

    grunt.registerTask('default', ['watch']);
    //grunt.registerTask('build', ['copy:build', 'htmlmin:build', 'uglify:build', 'cssmin:build']);
    grunt.registerTask('compile', ['ngtemplates', 'concat', 'ngAnnotate', 'uglify']);

    //'autoprefixer', 'cssmin'


};