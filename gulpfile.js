var gulp = require('gulp'),
		  fs = require('fs'),
		  del = require('del'),
		  replace = require('gulp-replace');

gulp.task('default', ['clean', 'build']);

gulp.task('build', function () {
	gulp.src('src/infinityscroll.css').pipe(gulp.dest('dist'));
	return gulp.src('src/infinityscroll.js').pipe(gulp.dest('dist'));
});
gulp.task('clean', function () {
	return del.sync(['dist/**/*']);
});
