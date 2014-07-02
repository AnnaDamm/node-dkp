"use strict";

var async   = require("async"),
    mongojs = require("mongojs");

module.exports = function (mongo, config, translation) {
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
            userObject = null;
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
            }
        ], function parallelDone() {
            res.render('index', {
                CSRFToken:    req.csrfToken(),
                user:         userObject,
                roles:        roleObject,
                recaptchaKey: config.recaptcha.publicKey,
                theme:        config.theme,
                translations: translation.getTranslation(req.params.language)
            });
        });
    };
};