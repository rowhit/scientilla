module.exports = function (grunt) {
    grunt.config.set('babel', {
        options: {
            sourceMap: true,
            presets: ['es2015']
        },
        dist: {
            files: [{
                expand: true,
                cwd: 'assets/js/',
                src: ['**/*.js'],
                dest: '.tmp/public/js/'
            }]
        }
    });

    require('load-grunt-tasks')(grunt);
};