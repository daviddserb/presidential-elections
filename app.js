var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

//Pop-up messages: cookie-session stores the data on the client VS express-session stores data on the server
var cookieSession = require('cookie-session');
var flash = require('connect-flash');

var expressSession = require('express-session'); //to get the logged-in user information

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//for pop-up messages
app.use(cookieSession({
    secret: 'secret-cookieSession',
    saveUninitialized: true,
    resave: false
}));
app.use(flash());

//to get the logged in user information
app.use(expressSession({
    secret: 'secret-expressSession',
    saveUninitialized: false,
    resave: false
}));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
