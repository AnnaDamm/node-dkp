"use strict";

var async   = require("async"),
    mongojs = require("mongojs"),
    uuid    = require("node-uuid"),
    crypto  = require("crypto");

module.exports = function (mongo) {
    var userCollection = mongo.collection('users');
    return function (req, res) {
        req.session.user = undefined; // Log the user out

        async.waterfall([
            function checkParameters(waterfallDone) {
                function checkExist(name) {
                    return req.body[name] && typeof req.body[name] === "string" && req.body[name].trim().length > 0;
                }
                function checkPattern(name, pattern) {
                    return req.body[name].match(pattern);
                }

                var min6CharPattern = /.{6,}/;

                if (!checkExist("hash")) {
                    return waterfallDone(new Error("hash"));
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
                waterfallDone();
            },
            function getUserData(waterfallDone) {
                userCollection.findOne({
                    "passwordReset.hash": req.body.hash,
                    "passwordReset.timeout": {
                        $gte: Date.now()
                    }
                }, function (error, user) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    if (!user) {
                        return waterfallDone(new Error("hash"));
                    }

                    waterfallDone(null, user);
                });
            },
            function setPassword(user, waterfallDone) {
                var salt = uuid.v4().replace(/-/g, ""),
                    hash = crypto.createHash('sha512'),
                    password;

                hash.update(JSON.stringify(salt + ":" + req.body.password));
                password = hash.digest('hex');

                userCollection.update({
                    _id: mongojs.ObjectId(user._id)
                }, {
                    $set: {
                        salt:     salt,
                        password: password
                    },
                    $unset: {
                        passwordReset: ""
                    }
                }, function (error) {
                    waterfallDone(error, user);
                });
            },
            function insertIntoSession(user, waterfallDone) {
                req.session.user = {
                    id: user._id,
                    login: req.body.login,
                    dkp: user.dkp,
                    characters: [{
                        name: req.body.charname
                    }],
                    isAdmin: user.isAdmin
                };
                waterfallDone();
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