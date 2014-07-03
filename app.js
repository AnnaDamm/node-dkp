#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

"use strict";

var rootDir = __dirname,
    express = require("express"),
    mongojs = require("mongojs"),

    // express middlewares

    bodyParser   = require("body-parser"),
    compression  = require("compression"),
    cookieParser = require("cookie-parser"),
    session      = require("express-session"),
    csurf        = require("csurf"),

    config       = require("./config.json"),

    routes       = require('./routes')(),
    RedisStore   = require('connect-redis')(session),

    mongo        = mongojs(config.mongo.url),

    // lib modules
    database     = require("./lib/database")(mongo),
    settings     = new require("./lib/settings")(config, mongo),
    translation  = new require("./lib/translation")(config, settings),

    packageJson  = require("./package.json"),

    app          = express();

// check if correct version
settings.get("version", function (error, version) {
    if (error || version !== packageJson.version) {
        console.log("Version mismatch. Please use the update script. (./update.js)");
        process.exit(1);
    }
});

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

routes.init(app, mongo, config, settings, translation);

app.use(function (error, req, res, next) {
    console.log(error.stack);
    res.send(500, "Internal Error");
});

app.listen(config.port, function () {
    console.log("Listening on port", config.port);
});