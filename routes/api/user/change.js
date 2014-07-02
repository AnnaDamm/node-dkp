"use strict";

var async   = require("async"),
    mongojs = require("mongojs"),
    crypto  = require("crypto"),

    checkForHexPattern = "[0-9a-fA-F]{24}",
    checkForHexRegExp  = new RegExp("^" + checkForHexPattern + "$");

module.exports = function (mongo) {
    var userCollection = mongo.collection('users');

    var changeFunctions = {
        isadmin: function (req, callback) {
            if (!req.body.pk.match(checkForHexRegExp)) {
                return callback(new Error("invalid id"));
            }
            if (req.body.value !== "1" && req.body.value !== "0") {
                return wallback(new Error("invalid request"));
            }
            if (req.body.pk === req.session.user.id) {
                return callback(new Error("unauthorized"));
            }
            userCollection.update({
                _id: mongojs.ObjectId(req.body.pk)
            }, {$set: {
                isAdmin: req.body.value === "1" ? true : false
            }}, callback);
        },
        isbanned: function (req, callback) {
            if (!req.body.pk.match(checkForHexRegExp)) {
                return callback(new Error("invalid id"));
            }
            if (req.body.value !== "1" && req.body.value !== "0") {
                return wallback(new Error("invalid request"));
            }
            if (req.body.pk === req.session.user.id) {
                return callback(new Error("unauthorized"));
            }

            var set = req.body.value === "1" ? {
                    $set: {
                        isBanned: true
                    }
                } : {
                    $unset: {
                        isBanned: 1
                    }
                };

            userCollection.update({
                _id: mongojs.ObjectId(req.body.pk)
            }, set, callback);
        },
        login: function (req, callback) {
            if (!req.body.pk.match(checkForHexRegExp)) {
                return callback(new Error("invalid id"));
            }
            if (!req.body.value.match(/[a-zA-Z0-9]{6,}/)) {
                return callback(new Error("invalid value"));
            }
            async.waterfall([
                function searchForUserWithSameLogin(waterfallDone) {
                    userCollection.findOne({
                        $or: [{
                            login: req.body.value
                        }, {
                            smallLogin: req.body.value.toLowerCase()
                        }]
                    }, function (error, user) {
                        if (error) {
                            return waterfallDone(error);
                        }
                        if (user) {
                            return waterfallDone(new Error("user with this name exists"));
                        }
                        waterfallDone();
                    });
                },
                function changeLoginName(waterfallDone) {
                    userCollection.update({
                        _id: mongojs.ObjectId(req.body.pk)
                    }, {
                        $set: {
                            login: req.body.value,
                            smallLogin: req.body.value.toLowerCase()
                        }
                    }, function (error) {
                        waterfallDone(error);
                    });
                }
            ], function waterfallDone(error) {
                callback(error);
            });
        },
        charname: function (req, callback) {
            if (!req.body.pk.match(new RegExp("^" + checkForHexPattern + "-[0-9]$"))) {
                return callback(new Error("invalid id"));
            }
            if (!req.body.value.match(/^[a-zA-Z0-9 \-]{3,}$/)) {
                return callback(new Error("invalid value"));
            }
            var splittedPk = req.body.pk.split("-");
            async.waterfall([
                function searchForCharWithSameName(waterfallDone) {
                    userCollection.findOne({
                        $or: [{
                            "characters.name": req.body.value
                        }, {
                            "characters.smallName": req.body.value.toLowerCase()
                        }]
                    }, function (error, user) {
                        if (error) {
                            return waterfallDone(error);
                        }
                        if (user) {
                            return waterfallDone(new Error("character with this name exists"));
                        }
                        waterfallDone();
                    });
                },
                function changeName(waterfallDone) {
                    var set = {};
                    set["characters." + splittedPk[1] + ".name"]      = req.body.value;
                    set["characters." + splittedPk[1] + ".smallName"] = req.body.value.toLowerCase();
                    userCollection.update({
                        _id: mongojs.ObjectId(splittedPk[0])
                    }, {
                        $set: set
                    }, function (error) {
                        waterfallDone(error);
                    });
                }
            ], function waterfallDone(error) {
                callback(error);
            });
        },
        email: function (req, callback) {
            if (!req.body.pk.match(checkForHexRegExp)) {
                return callback(new Error("invalid id"));
            }
            if (!req.body.value.match(/^[a-zA-Z0-9+\-]+@[a-zA-Z0-9\-]+\.[a-z]{2,4}$/)) {
                return callback(new Error("invalid value"));
            }
            async.waterfall([
                function searchForUserWithSameEmail(waterfallDone) {
                    userCollection.findOne({
                        email: req.body.value.toLowerCase()
                    }, function (error, user) {
                        if (error) {
                            return waterfallDone(error);
                        }
                        if (user) {
                            return waterfallDone(new Error("user with this email exists"));
                        }
                        waterfallDone();
                    });
                },
                function changeEmail(waterfallDone) {
                    userCollection.update({
                        _id: mongojs.ObjectId(req.body.pk)
                    }, {
                        $set: {
                            email: req.body.value.toLowerCase()
                        }
                    }, function (error) {
                        waterfallDone(error);
                    });
                }
            ], function waterfallDone(error) {
                callback(error);
            });
        }
    };


    return function (req, res) {
        async.waterfall([
            function checkIfUserIsAdmin(waterfallDone) {
                if (!req.session.user || !req.session.user.isAdmin) {
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

                if (!checkExist("name") || !checkExist("pk") || !checkExist("value")) {
                    return waterfallDone(new Error("invalid request"));
                }
                if (!changeFunctions[req.body.name]) {
                    return waterfallDone(new Error("value not changable"));
                }

                waterfallDone();
            },
            function setNewData(waterfallDone) {
                changeFunctions[req.body.name](req, waterfallDone);
            }
        ], function waterfallDone(error) {
            if (error) {
                return res.json({
                    success: false,
                    data: error.message
                });
            }
            return res.json({
                success: true,
                name:  req.body.name,
                value: req.body.value,
                pk:    req.body.pk
            });
        });
    };
};