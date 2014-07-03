"use strict";

var async = require("async");

module.exports = function (config, mongo) {
    var settingsCollection = mongo.collection("settings"),
        settings = {};

    function get(key, callback) {
        if (settings.hasOwnProperty(key)) {
            return callback(null, settings[key]);
        }

        settingsCollection.findOne({
            key: key
        }, function (error, data) {
            if (error) {
                return callback(error);
            }
            if (!data) {
                return callback(new Error("key not found."));
            }
            settings[key] = data.value;
            callback(null, data.value);
        });
    }

    function getMultiple(keys, callback) {
        var values = {};
        async.each(keys, function (key, eachDone) {
            get(key, function (error, value) {
                if (!error) {
                    values[key] = value;
                }
                eachDone();
            });
        }, function (error) {
            callback(error, values);
        });
    }

    function set(key, value, callback) {
        if (typeof callback !== "function") {
            callback = function () {};
        }
        settingsCollection.update({
            key: key
        }, {
            key:   key,
            value: value
        }, {
            upsert: true
        }, function (error) {
            if (error) {
                return callback(error);
            }
            settings[key] = value;
            callback();
        });
    }

    (function init() {
        settingsCollection.find({$query: {}, $orderby: { key: 1 }}, function (error, data) {
            if (error) {
                console.log("Error reading settings from database.");
                process.exit(1);
            }
            if (data && data.length > 0) {
                settings = {};
                data.forEach(function (oneSetting) {
                    settings[oneSetting.key] = oneSetting.value;
                });
            }
            console.log("Read settings.");
        });
    }());


    return {
        get:         get,
        getMultiple: getMultiple,
        set:         set
    };
};