"use strict";

var path     = require("path"),
    fs       = require("fs"),
    chokidar = require("chokidar"),
    async    = require("async");

module.exports = function (config) {
    var translations,
        defaultLanguage;


    function getTranslation(language) {
        return translations[language];
    }

    function getDefaultLanguage(req) {
        return defaultLanguage;
    }

    function hasLanguage(language) {
        return translations.hasOwnProperty(language);
    }

    function getLanguages() {
        return Object.getOwnPropertyNames(translations);
    }

    (function init() {
        var translationDirName = path.normalize(path.join(__dirname, "..", "translations")),
            languagePattern = /^[a-z]{2}\.json$/;

        translations = {};
        defaultLanguage = config.defaultLanguage;

        function readFile(fileName, callback) {
            var fullFileName = path.join(translationDirName, fileName);

            fs.stat(fullFileName, function (error, stats) {
                if (error) {
                    console.log("Could not read stats of file", fileName);
                    return callback();
                }
                if (!stats.isFile()) {
                    return callback();
                }

                if (!fileName.match(languagePattern)) {
                    return callback();
                }
                fs.readFile(fullFileName, function (error, data) {
                    if (error) {
                        console.log("Could not read translation file", fileName);
                        return callback();
                    }
                    try {
                        var languageName = fileName.split(".")[0];
                        translations[languageName] = JSON.parse(data);
                    } catch (e) {
                        console.log("Could not read translation file", fileName);
                    }
                    callback();
                });
            });
        }

        function readDirectory(callback) {
            fs.readdir(translationDirName, function (error, fileNames) {
                if (error) {
                    console.log("Translations could not be loaded");
                    process.exit(1);
                }
                async.each(fileNames, function (fileName, eachDone) {
                    readFile(fileName, eachDone);
                }, function eachDone() {
                    if (!hasLanguage(config.defaultLanguage)) {
                        defaultLanguage = getLanguages()[0];
                        console.log("Default language", config.defaultLanguage, "could not be found, using", defaultLanguage, "instead");
                    }
                    callback();
                });
            });
        }

        readDirectory(function () {
            var watcher = chokidar.watch(translationDirName, {
                persistent: false
            });
            watcher
                .on('change', function (filePath) {
                    var basename = path.basename(filePath);
                    readFile(basename, function () {
                        console.log("Translations for", basename.split(".")[0], "reloaded.");
                    });
                });
        });
    }());

    return {
        getTranslation:     getTranslation,
        getDefaultLanguage: getDefaultLanguage,
        hasLanguage:        hasLanguage,
        getLanguages:       getLanguages
    };
};