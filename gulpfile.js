// Gulp
var gulp = require('gulp');

//  Plugins
var jshint = require('gulp-jshint');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var babel = require('gulp-babel');

// Lint Task
gulp.task('lint', function() {
    return gulp.src('client/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// Compile Our Sass
gulp.task('sass', function() {
    return gulp.src('scss/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('public/css'));
});

// Convert JSX to JS, then Concatenate & Minify JS
gulp.task('scripts', function() {
    return gulp.src('client/*.jsx')
        .pipe(babel({
            plugins: ['transform-react-jsx']
        }))
        .pipe(concat('all.js'))
        .pipe(gulp.dest('public/js'))
        .pipe(rename('all.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('public/js'));
});

gulp.task('build', function() {
  return gulp.src('views/**/*.js')
    .pipe(jsx({
      factory: 'React.createClass'
    }))
    .pipe(gulp.dest('dist'));
});




// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch('client/*.jsx', ['lint', 'scripts']);
    gulp.watch('scss/*.scss', ['sass']);
});

// Default Task
gulp.task('default', ['lint', 'sass', 'scripts', 'watch']);
