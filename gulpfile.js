// Gulp
var gulp = require('gulp')

//  Plugins
var jshint = require('gulp-jshint')
var sass = require('gulp-sass')
// var concat = require('gulp-concat')
var uglify = require('gulp-uglify')
var rename = require('gulp-rename')
var babelify = require('babelify')
var browserify = require('browserify')
var buffer = require('vinyl-buffer')
var source = require('vinyl-source-stream')
var sourcemaps = require('gulp-sourcemaps')

// Lint Task
gulp.task('lint', function () {
  return gulp.src('src/client/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
})

// Compile Our Sass
gulp.task('sass', function () {
  return gulp.src('scss/*.scss')
      .pipe(sass())
      .pipe(gulp.dest('public/css'))
})

// Convert JSX to JS, then Concatenate & Minify JS
gulp.task('scripts', function () {
  var bundler = browserify({
    entries: 'client/index.js',
    debug: true
  })
  bundler.transform(babelify)
  bundler.bundle()
      .on('error', function (err) { console.error(err) })
      .pipe(source('index.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(uglify()) // Use any gulp plugins you want now
      .pipe(sourcemaps.write('./'))
      .pipe(rename('client.js'))
      .pipe(gulp.dest('public/js'))
})

// Watch Files For Changes
gulp.task('watch', function () {
  gulp.watch('./client/*.js', ['lint', 'scripts'])
  gulp.watch('./client/**/*.js', ['lint', 'scripts'])
  gulp.watch('scss/*.scss', ['sass'])
})

// Default Task
gulp.task('default', ['lint', 'sass', 'scripts', 'watch'])
