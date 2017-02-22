/*!
 * Figuration Table
 * Copyright 2017 CAST, Inc.
 * Licensed under MIT (https://github.com/cast-org/figuration-table/blob/master/LICENSE)
 */

module.exports = function(grunt) {
    'use strict';

    // Force use of Unix newlines
    grunt.util.linefeed = '\n';

    RegExp.quote = function(string) {
        return string.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
    };

    var autoprefixerSettings = require('./grunt/autoprefixer-settings.js');
    var autoprefixer = require('autoprefixer')(autoprefixerSettings);
    var flexbugs = require('postcss-flexbugs-fixes');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*!\n' +
                ' * Figuration Table(v<%= pkg.version %>)\n' +
                ' * <%= pkg.homepage %>\n' +
                ' * Copyright <%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
                ' * Licensed under MIT (https://github.com/cast-org/figuration-table/blob/master/LICENSE)\n' +
                ' */\n',
        jqueryCheck: 'if (typeof jQuery === \'undefined\') {\n' +
                     '  throw new Error(\'Figuration Table\\\'s JavaScript requires jQuery\');\n' +
                     '}\n',
        jqueryVersionCheck: '(function($) {\n' +
                            '  var version = $.fn.jquery.split(\' \')[0].split(\'.\');\n' +
                            '  if ((version[0] < 2 && version[1] < 9) || (version[0] == 1 && version[1] == 9 && version[2] < 1) || (version[0] >= 4)) {\n' +
                            '    throw new Error(\'Figuration Table\\\'s JavaScript requires at least jQuery v1.9.1 but less than v4.0.0\');\n' +
                            '  }\n' +
                            '})(jQuery);\n\n',

        // File definitions
        // ==========
        jsCore: [
            'js/util.js',
            'js/figuration-table.js'
            /*
            'js/util.js',
            'js/drag.js',
            'js/collapse.js',
            'js/dropdown.js',
            'js/tab.js',
            'js/affix.js',
            'js/tooltip.js',
            'js/popover.js',
            'js/modal.js',
            'js/accordion.js',
            'js/tab-responsive.js',
            'js/slideshow.js',
            'js/scrollspy.js',
            'js/alert.js',
            'js/button.js',
            'js/lazy.js',
            'js/slider.js',
            'js/img-compare.js',
            'js/equalize.js',
            'js/player.js',
            'js/common.js'
            */
        ],

        // Task configs
        // ==========
        clean: {
            dist: 'dist'
        },

        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            grunt: {
                options: {
                    jshintrc: 'grunt/.jshintrc'
                },
                src: ['Gruntfile.js', 'grunt/*.js']
            },
            core: {
                src: '<%= jsCore %>'
            },
            test: {
                options: {
                    jshintrc: 'test/js/unit/.jshintrc'
                },
                src: 'test/js/unit/*.js'
            }
        },

        jscs: {
            options: {
                config: '.jscsrc'
            },
            grunt: {
                src: '<%= jshint.grunt.src %>'
            },
            core: {
                src: '<%= jshint.core.src %>'
            },
            test: {
                src: '<%= jshint.test.src %>'
            }
        },

        qunit: {
            options: {
                inject: 'test/js/unit/phantom.js'
            },
            files: 'test/js/index.html'
        },

        concat: {
            options: {
                banner: '<%= banner %>\n<%= jqueryCheck %>\n<%= jqueryVersionCheck %>',
                stripBanners: false
            },
            core: {
                src: '<%= jsCore %>',
                dest: 'dist/js/<%= pkg.name %>.js'
            }
        },

        uglify: {
            options: {
                compress: {
                    warnings: false
                },
                mangle: true,
                preserveComments: /^!|@preserve|@license|@cc_on/i
            },
            core: {
                src: '<%= concat.core.dest %>',
                dest: 'dist/js/<%= pkg.name %>.min.js'
            }
        },

        sasslint: {
            options: {
                configFile: 'src/scss/.sass-lint.yml'
            },
            core: ['src/scss/\*.scss']
        },

        sass: {
            options: {
                includePaths: ['scss'],
                precision: 6,
                sourceComments: false,
                sourceMap: true,
                outputStyle: 'expanded'
            },
            core: {
                files: {
                    'dist/css/<%= pkg.name %>.css': 'scss/<%= pkg.name %>.scss'
                }
            }
        },

        postcss: {
            core: {
                options: {
                    map: true,
                    processors: [flexbugs, autoprefixer]
                },
                src: ['dist/css/*.css', '!dist/css/*.min.css']
            }
        },

        cssmin: {
            options: {
                compatibility: 'ie9',
                keepSpecialComments: '*',
                sourceMap: true,
                advanced: false
            },
            core: {
                files: [
                    {
                        expand: true,
                        cwd: 'dist/css',
                        src: ['*.css', '!*.min.css'],
                        dest: 'dist/css',
                        ext: '.min.css'
                    }
                ]
            }
        },

        watch: {
            src: {
                files: '<%= jshint.core.src %>',
                tasks: ['jshint:core', 'qunit', 'concat']
            },
            sass: {
                files: 'scss/**/*.scss',
                tasks: ['dist-css']
            }
        }
    });

    // Tasks
    // ==========
    // Load required plugins for tasks
    require('load-grunt-tasks')(grunt, { scope: 'devDependencies' });
    require('time-grunt')(grunt);

    // Default
    grunt.registerTask('default', ['clean:dist', 'test']);

    // Test
    grunt.registerTask('test', ['dist-css', 'dist-js', 'test-css', 'test-js']);
    grunt.registerTask('test-css', ['sasslint:core']);

    // Test - JS subtasks
    // var jsTestTasks = ['jshint:core', 'jshint:test', 'jshint:grunt', 'jscs:core', 'jscs:test', 'jscs:grunt', 'qunit'];
    var jsTestTasks = ['jshint:core', 'jshint:grunt', 'jscs:core', 'jscs:grunt', 'qunit'];
    grunt.registerTask('test-js', jsTestTasks);

    // CSS distribution
    grunt.registerTask('dist-css', ['sass:core', 'postcss:core', 'cssmin:core']);

    // JS distribution
    grunt.registerTask('dist-js', ['concat', 'uglify:core']);

    // Full distribution
    grunt.registerTask('dist', ['clean:dist', 'dist-css', 'dist-js']);
};
