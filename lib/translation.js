"use strict";

var path     = require("path"),
    fs       = require("fs"),
    chokidar = require("chokidar"),
    async    = require("async");

module.exports = function (config, settings) {
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

    function getLanguageNames() {
        var names = {};
        Object.getOwnPropertyNames(translations).forEach(function (key) {
            var shortName = translate("language.short", key),
                longName  = translate("language.name", key);
            names[shortName] = longName;
        });
        return names;
    }

    function translate(key, language) {
        function formatKey(string) {
            var args = Array.prototype.slice.call(arguments, 1);
            return string.replace(/\{(\d+)\}/g, function (match, number) {
                return args[number] !== undefined ? args[number] : match;
            });
        }

        var translation,
            parameters;

        if (!hasLanguage(language)) {
            return key;
        }

        if (translations[language].hasOwnProperty(key)) {
            translation = translations[language][key];
        } else {
            translation = key;
        }

        if (arguments.length > 1) {
            parameters = [translation].concat(Array.prototype.slice.call(arguments, 1));
            translation = formatKey.apply(this, parameters);
        }

        return translation;
    }

    (function init() {
        var translationDirName = path.normalize(path.join(__dirname, "..", "translations")),
            languagePattern = /^[a-z]{2}\.json$/;

        translations = {};

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
                    settings.get("defaultLanguage", function (error, language) {
                        if (!hasLanguage(language)) {
                            language = getLanguages()[0];
                        }
                        defaultLanguage = language;
                        console.log("Setting default language to", defaultLanguage);
                        callback();
                    });
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
        getLanguages:       getLanguages,
        getLanguageNames:   getLanguageNames,
        translate:          translate
    };
};