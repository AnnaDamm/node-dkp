#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

"use strict";

var sys          = require("sys"),
    async        = require("async"),
    mongojs      = require("mongojs"),
    uuid         = require("node-uuid"),
    read         = require("read"),
    crypto       = require("crypto"),
    fs           = require("fs"),

    defaultSettings = require("./lib/defaultSettings.json"),
    packageJson     = require("./package.json"),

    // init variables that rely on a config file
    config       = require("./config.json"),
    mongo        = mongojs(config.mongo.url),
    database     = require("./lib/database")(mongo);

async.waterfall([
    function initDatabase(waterfallDone) {
        console.log(" ");
        console.log("------------------");
        console.log("Initializing database...");
        database.createIndexes(waterfallDone);
    },
    function createDefaultSettings(waterfallDone) {
        console.log(" ");
        console.log("------------------");
        console.log("Insert default settings...");
        var settingsCollection = mongo.collection("settings");
        async.each(Object.getOwnPropertyNames(defaultSettings), function (key, eachDone) {
            settingsCollection.update({
                key: key
            }, {
                $setOnInsert: {
                    key: key,
                    value: defaultSettings[key]
                }
            }, {
                upsert: true
            }, function (error) {
                eachDone(error);
            });
        }, function eachDone(error) {
            waterfallDone(error);
        });
    },
    function updateVersion(waterfallDone) {
        mongo.collection("settings").update({
            key: "version"
        }, {
            key: "version",
            value: packageJson.version
        }, {
            upsert: true
        }, function (error) {
            waterfallDone(error);
        });
    }
], function waterfallDone(error) {
    if (error) {
        console.log(error);
        process.exit(1);
    }
    console.log(" ");
    console.log("------------------");
    console.log("Finished installation.");
    process.exit();
});