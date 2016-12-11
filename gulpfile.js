// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var jshint = require('gulp-jshint');
var sass = require('gulp-sass');
var less = require('gulp-less');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var cleancss = require('gulp-clean-css');
var coffee = require('gulp-coffee');
var sourcemaps = require('gulp-sourcemaps');
var header = require('gulp-header');

// Lint Task
gulp.task('lint', function() {
    return gulp.src('js/*.js')
        // .pipe(jshint({
        //     laxcomma: true
        // }))
        .pipe(jshint.reporter('default'));
});

// Compile Our Sass
gulp.task('sass', function() {
    return gulp.src([
            'scss/*.scss'
        ])
        .pipe(sass())
        .pipe(cleancss())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('css'));
});

// Compile Our Sass
gulp.task('less', function() {
    return gulp.src([
            'less/*.less'
        ])
        .pipe(less())
        .pipe(gulp.dest('css'))
        .pipe(cleancss())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('css'));
});

// Concatenate & Minify JS
gulp.task('scripts', function() {
    return gulp.src([
            'js/*.js'
        ])
        .pipe(concat('all.js'))
        .pipe(gulp.dest('js'))
        .pipe(rename('all.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('js'));
});

gulp.task('coffee', () => {
    // using data from package.json
    var pkg = require('./package.json');
    var banner = ['###',
      ' * <%= pkg.name %> - <%= pkg.description %>',
      ' * @version v<%= pkg.version %>',
      ' * @link <%= pkg.homepage %>',
      ' * @license <%= pkg.license %>',
      ' ###',
      ''].join('\n');

    return gulp.src([
            'src/*.coffee',
        ])
        .pipe(header(banner, { pkg : pkg } ))
        .pipe(sourcemaps.init())
        .pipe(coffee({
            bare: true
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('.'))
    &&
    gulp.src([
            'src/js/*.coffee'
        ])
        .pipe(header(banner, { pkg : pkg } ))
        .pipe(sourcemaps.init())
        .pipe(coffee({
            bare: true
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('js'));
});

// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch(['src/*.coffee', 'src/js/*.coffee'], ['coffee']);
    // gulp.watch('js/*.js', ['lint', 'scripts']);
    // gulp.watch('scss/*.scss', ['sass']);
});

// Default Task
gulp.task('default', ['coffee']); // ['lint', 'less', 'coffee', 'scripts']);
