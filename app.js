#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

"use strict";

var rootDir = __dirname,

    config  = require("./config"),
    express = require("express"),
    mongojs = require("mongojs"),

    // express middlewares

    bodyParser   = require("body-parser"),
    compression  = require("compression"),
    cookieParser = require("cookie-parser"),
    session      = require("express-session"),
    csurf        = require("csurf"),

    app          = express(),

    mongo        = mongojs(config.mongo.url, [
        "users", "raids", "raidSettings", "items"
    ]),

    routes       = require('./routes')(),
    database     = require("./database")(),

    RedisStore   = require('connect-redis')(session),


    // lib modules
    translation = new require("./lib/translation")(config);


if (process.env.NODE_ENV !== "development") {
    app.set('view cache', true);
}

app.set('view engine', 'ejs');
app.set('views', rootDir + "/views");


app.use(compression());
app.use("/:language/",express["static"](rootDir + "/public"));

app.use(cookieParser(config.cookie.secret));
app.use(session({
    secret: config.session.secret,
    resave: true,
    saveUninitialized: false,
    store: new RedisStore(config.redis),
    cookie: {
        maxAge: config.cookie.maxAge
    }
}));

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(csurf());


app.use(function (req, res, next) {
    req.hostUrl = req.protocol + "://" + config.hostname + ([80, 443].indexOf(config.port) < 0 ? ":" + config.port : "");

    next();
});

database.init(mongo);
routes.init(app, mongo, config, translation);

app.use(function (error, req, res, next) {
    console.log(error.stack);
    res.send(500, "Internal Error");
});

app.listen(config.port, function () {
    console.log("Listening on port", config.port);
});