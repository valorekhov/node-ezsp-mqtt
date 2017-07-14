const gulp = require('gulp');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const del = require('del');

var tsProject = ts.createProject('./tsconfig.json');

gulp.task('ts-compile', function () {
    var tsResult = gulp.src(['src/**/*.ts'])
                       .pipe(sourcemaps.init())
                       .pipe(tsProject());
    return tsResult
            .pipe(sourcemaps.write())
            .pipe(gulp.dest('build'));
})

gulp.task('clean', function(cb) {
    del(['build', 'typings'], cb);
});

gulp.task('default', function() {
    gulp.start('ts-compile');
});

gulp.task('watch', ['ts-compile'], function() {
    gulp.watch('src/*.ts', ['ts-compile']);
});
