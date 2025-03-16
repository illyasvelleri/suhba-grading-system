var createError = require('http-errors');
var express = require('express');
var path = require('path');
const mongoose = require("mongoose");
const exphbs = require("express-handlebars");
const flash = require("connect-flash");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const dotenv = require("dotenv");
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const connectDB = require('./config/db');
const autoHashPassword = require("./utils/hashEnv");

dotenv.config();
autoHashPassword(); // Auto Hash Admin Password on Server Start 🔥
connectDB();

var adminRouter = require('./routes/adminRoutes');
var userRouter = require('./routes/userRoutes');

var app = express();

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'hbs');

// Handlebars Middleware
// app.engine("hbs", exphbs.engine({ extname: ".hbs" }));
// app.set("view engine", "hbs");


// Handlebars setup
const hbs = exphbs.create({
  extname: "hbs",
  defaultLayout: "layout",
  layoutsDir: path.join(__dirname, "views", "layouts"),
  partialsDir: path.join(__dirname, "views", "partials"),
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,  // ✅ Allow accessing properties
    allowProtoMethodsByDefault: true,    // ✅ Allow calling prototype methods
  },
  helpers: {
    or: function (a, b, options) {
      return (a || b) ? options.fn(this) : options.inverse(this);
    },
    eq: function (a, b) {
      return a === b;
    },
    lookup: function (obj, key) {
      return obj ? obj[key] : "";
    },
    isEditable: function (type) {
      return type !== "text" && type !== "radio";
    },
    lookupIsEditable: function (columns, index) {
      return columns?.[index]?.isEditable || false;
    }
  },
});


app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));


app.use(logger('dev'));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "grading-system-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI, // Your MongoDB URL
      collectionName: "sessions",
      ttl: 60 * 60, // 1 Hour Session Expiration
    }),
    cookie: {
      secure: false, // Use true in HTTPS
      httpOnly: true, // Prevent JS Access
      maxAge: 60 * 60 * 1000, // 1 Hour Expiration
    },
  })
);


// Flash Middleware
app.use(flash());

// Global Flash Message Middleware
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
