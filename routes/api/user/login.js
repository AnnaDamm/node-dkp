"use strict";

var async  = require("async"),
    crypto = require("crypto");

module.exports = function (mongo) {
    var userCollection = mongo.collection('users');
    return function (req, res) {

        async.waterfall([
            function validateForm(waterfallDone) {
                function checkExist(name) {
                    return req.body[name] && typeof req.body[name] === "string"&& req.body[name].trim().length > 0;
                }

                if (!checkExist("login")) {
                    return waterfallDone(new Error("login"));
                }
                if (!checkExist("password")) {
                    return waterfallDone(new Error("password"));
                }

                return waterfallDone();
            },

            function checkLogin(waterfallDone) {
                userCollection.findOne({ login: req.body.login }, function (error, user) {
                    if (error || !user) {
                        return waterfallDone(new Error("login,password"));
                    }
                    return waterfallDone(null, user);
                });
            },

            function checkPassword(user, waterfallDone) {
                var hash = crypto.createHash('sha512');
                hash.update(JSON.stringify(user.salt + ":" + req.body.password));
                if (hash.digest('hex') === user.password) {
                    return waterfallDone(null, user);
                }
                return waterfallDone(new Error("login,password"));
            },

            function checkIfUserIsBanned(user, waterfallDone) {
                if (user.isBanned) {
                    return waterfallDone(new Error("banned"));
                }
                waterfallDone(null, user);
            },

            function checkIfSmallLoginsAreThere(user, waterfallDone) {
                if (!user.smallLogin || !user.characters[0].smallName) {
                    userCollection.update({ _id: user._id}, {$set: {
                        smallLogin: user.login.toLowerCase(),
                        "characters.0.smallName": user.characters[0].name.toLowerCase()
                    }}, function (error) {
                        waterfallDone(error, user);
                    });
                } else {
                    waterfallDone(null, user);
                }
            },

            function insertIntoSession(user, waterfallDone) {
                req.session.user = {
                    id:         user._id,
                    login:      user.login,
                    dkp:        user.dkp,
                    characters: user.characters,
                    isAdmin:    user.isAdmin
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