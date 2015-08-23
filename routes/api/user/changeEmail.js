"use strict";

var async   = require("async"),
    mongojs = require("mongojs"),
    crypto  = require("crypto");

module.exports = function (mongo) {
    var userCollection = mongo.collection('users');
    return function (req, res) {
        async.waterfall([
            function checkUserLoggedIn(waterfallDone) {
                if (!req.session.user) {
                    return waterfallDone(new Error("unauthorized"));
                }
                waterfallDone();
            },
            function checkParameters(waterfallDone) {
                function checkExist(name) {
                    return req.body[name] && typeof req.body[name] === "string" && req.body[name].trim().length > 0;
                }
                function checkPattern(name, pattern) {
                    return req.body[name].match(pattern);
                }

                // todo: check for better email regex
                if (!checkExist("email") || !checkPattern("email", /^[a-zA-Z0-9+\-_.%]+@[a-zA-Z0-9\-.]+\.[a-z]{2,6}$/)) {
                    return waterfallDone(new Error("email"));
                }

                if (!checkExist("oldpassword")) {
                    return waterfallDone(new Error("oldpassword"));
                }

                waterfallDone();
            },
            function checkEmail(waterfallDone) {
                userCollection.find({
                    email: req.body.email.toLowerCase(),
                    _id: {
                        $ne: mongojs.ObjectId(req.session.user.id)
                    }
                }, function (error, users) {
                    if (error) {
                        return waterfallDone(new Error());
                    }
                    if (users.length > 0) {
                        return waterfallDone(new Error("email"));
                    }
                    return waterfallDone();
                });
            },
            function checkOldPassword(waterfallDone) {
                userCollection.findOne({
                    _id: mongojs.ObjectId(req.session.user.id)
                }, {
                    salt: 1,
                    password: 1
                }, function (error, user) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    if (!user) {
                        return waterfallDone(new Error("unauthorized"));
                    }
                    var hash = crypto.createHash('sha512');
                    hash.update(JSON.stringify(user.salt + ":" + req.body.oldpassword));
                    if (hash.digest('hex') !== user.password) {
                        return waterfallDone(new Error("oldpassword"));
                    }
                    return waterfallDone();
                });
            },
            function setNewEmail(waterfallDone) {
                userCollection.update({
                    _id: mongojs.ObjectId(req.session.user.id)
                }, {
                    $set: {
                        email: req.body.email.toLowerCase()
                    }
                }, function (error) {
                    waterfallDone(error);
                });
            }
        ], function waterfallDone(error) {
            if (error) {
                return res.json({
                    success: false,
                    data: error.message
                });
            }
            return res.json({
                success: true
            });
        });
    };
};