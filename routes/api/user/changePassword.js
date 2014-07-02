"use strict";

var async   = require("async"),
    mongojs = require("mongojs"),
    uuid    = require("node-uuid"),
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

                var min6CharPattern = /.{6,}/;

                if (!checkExist("password") || !checkPattern("password", min6CharPattern)) {
                    return waterfallDone(new Error("password"));
                }
                if (!checkExist("password2") || !checkPattern("password2", min6CharPattern)) {
                    return waterfallDone(new Error("password2"));
                }

                if (req.body.password !== req.body.password2) {
                    return waterfallDone(new Error("password,password2"));
                }

                if (!checkExist("oldpassword")) {
                    return waterfallDone(new Error("oldpassword"));
                }

                waterfallDone();
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
            function setNewPassword(waterfallDone) {
                var salt = uuid.v4().replace(/-/g, ""),
                    setObject = {
                        salt: salt
                    },
                    hash = crypto.createHash('sha512');

                hash.update(JSON.stringify(salt + ":" + req.body.password));

                setObject.password = hash.digest('hex');

                userCollection.update({
                    _id: mongojs.ObjectId(req.session.user.id)
                }, {
                    $set: setObject
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