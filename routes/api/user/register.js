"use strict";

var async     = require("async"),
    crypto    = require("crypto"),
    uuid      = require("node-uuid"),
    recaptcha = require("simple-recaptcha");

module.exports = function (mongo, config) {
    var userCollection = mongo.collection('users');
    return function (req, res) {

        async.waterfall([
            function validateForm(waterfallDone) {
                function checkExist(name) {
                    return req.body[name] && typeof req.body[name] === "string" && req.body[name].trim().length > 0;
                }
                function checkPattern(name, pattern) {
                    return req.body[name].match(pattern);
                }

                var min6CharPattern = /.{6,}/;

                if (!checkExist("login") || !checkPattern("login", /[a-zA-Z0-9]{6,}/)) {
                    return waterfallDone(new Error("login"));
                }
                if (!checkExist("password") || !checkPattern("password", min6CharPattern)) {
                    return waterfallDone(new Error("password"));
                }
                if (!checkExist("password2") || !checkPattern("password2", min6CharPattern)) {
                    return waterfallDone(new Error("password2"));
                }
                if (req.body.password !== req.body.password2) {
                    return waterfallDone(new Error("password,password2"));
                }
                // todo: check for better email regex
                if (!checkExist("email") || !checkPattern("email", /^[a-zA-Z0-9+\-]+@[a-zA-Z0-9\-]+\.[a-z]{2,4}$/)) {
                    return waterfallDone(new Error("email"));
                }
                if (!checkExist("charname") || !checkPattern("charname", /^[a-zA-Z0-9 \-]{3,}$/)) {
                    return waterfallDone(new Error("charname"));
                }

                return waterfallDone();
            },

            function checkRecaptcha(waterfallDone) {
                if (config.recaptcha.privateKey.length === 0) {
                    return waterfallDone();
                }

                var ip = req.ip,
                    challenge = req.body.recaptcha_challenge_field,
                    response  = req.body.recaptcha_response_field;

                recaptcha(config.recaptcha.privateKey, ip, challenge, response, function (error) {
                    if (error) {
                        return waterfallDone(new Error("message:" + error.message));
                    }
                    waterfallDone();
                });
            },

            function checkLogin(waterfallDone) {
                userCollection.find({ "$or": [
                    { login: req.body.login },
                    { smallLogin: req.body.login.toLowerCase() },
                    { email: req.body.email.toLowerCase() },
                    { "characters.name": req.body.charname },
                    { "characters.smallName": req.body.charname.toLowerCase() }
                ]}, function (error, users) {
                    if (error) {
                        return waterfallDone(new Error());
                    }
                    if (users.length > 0) {
                        var fields = [];
                        users.forEach(function (user) {
                            if (user.login === req.body.login) {
                                fields.push("login");
                            }
                            if (user.email === req.body.email) {
                                fields.push("email");
                            }
                            user.characters.forEach(function (character) {
                                if (character.name === req.body.charname) {
                                    fields.push("charname");
                                }
                            });
                        });
                        return waterfallDone(new Error(fields));
                    }
                    return waterfallDone();
                });
            },

            function insertUserIntoDatabase(waterfallDone) {
                var salt = uuid.v4().replace(/-/g, ""),
                    user = {
                        login: req.body.login,
                        smallLogin: req.body.login.toLowerCase(),
                        salt: salt,
                        password: "",
                        email: req.body.email.toLowerCase(),
                        characters: [{
                            name: req.body.charname,
                            smallName: req.body.charname.toLowerCase
                        }],
                        isAdmin: false,
                        dkp: 0
                    },
                    hash = crypto.createHash('sha512');
                hash.update(JSON.stringify(salt + ":" + req.body.password));

                user.password = hash.digest('hex');

                userCollection.insert(user, function (error, user) {
                    waterfallDone(error, user);
                });
            },

            function insertIntoSession(user, waterfallDone) {
                req.session.user = {
                    id: user._id,
                    login: req.body.login,
                    dkp: 0,
                    characters: [{
                        name: req.body.charname
                    }],
                    isAdmin: false
                };
                waterfallDone(null, req.session.user);
            }
        ], function waterfallDone(error, user) {
            if (error) {
                return res.json({
                    success: false,
                    data: error.message
                });
            }
            return res.json({
                success: true,
                user: user
            });
        });

    };
};