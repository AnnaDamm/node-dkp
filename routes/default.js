"use strict";

var async   = require("async"),
    mongojs = require("mongojs"),
    defaultSettings = require(__dirname + "/../defaultSettings.json");

module.exports = function (mongo, config, settings, translation) {
    var roleCollection = mongo.collection('roles'),
        userCollection = mongo.collection('users');

    function repeatString(string, amount) {
        if (amount === 0) {
            return "";
        }
        return new Array(amount + 1).join(string);
    }

    function anonymizeEmail(email) {
        return email.replace(/^([a-zA-Z0-9+\-]{1,4})([a-zA-Z0-9+\-]*)(@[a-zA-Z0-9\-]+\.[a-z]{2,4})$/, function (string, nonAnonymized, anonymized, domain) {
            return nonAnonymized + repeatString("*", anonymized.length) + domain;
        });
    }
    return function (req, res) {
        var roleObject = {},
            userObject = null,
            settingsObject;
        async.parallel([
            function getRoles(parallelDone) {
                roleCollection.find({
                    $query: {},
                    $orderby: { rank: 1}
                }, function (error, roles) {
                    if (error) {
                        return parallelDone();
                    }
                    roles.forEach(function (role) {
                        roleObject[role._id] = role.name;
                    });

                    parallelDone();
                });
            },
            function getUserData(parallelDone) {
                if (!req.session.user) {
                    return parallelDone();
                }
                userCollection.findOne({_id: mongojs.ObjectId(req.session.user.id)}, function (error, user) {
                    if (error || !user) {
                        req.session.user = undefined;
                        return parallelDone();
                    }
                    req.session.user = {
                        id:         user._id,
                        login:      user.login,
                        dkp:        user.dkp,
                        characters: user.characters,
                        isAdmin:    user.isAdmin,
                        email:      anonymizeEmail(user.email)
                    };
                    userObject = req.session.user;

                    parallelDone();
                });
            },
            function getSettings(parallelDone) {
                settings.getMultiple(["siteName", "theme", "recaptcha"], function (error, values) {
                    settingsObject = values;
                    parallelDone();
                });
            }
        ], function parallelDone() {
            res.render('index', {
                CSRFToken:    req.csrfToken(),
                user:         userObject,
                roles:        roleObject,
                recaptchaKey: settingsObject.recaptcha || defaultSettings.recaptcha,
                theme:        settingsObject.theme     || defaultSettings.theme,
                translations: translation.getTranslation(req.params.language),
                translate:  function (key) {
                    return translation.translate(key, req.params.language)
                },
                languageNames : translation.getLanguageNames(),
                siteName:     settingsObject.siteName  || defaultSettings.siteName
            });
        });
    };
};