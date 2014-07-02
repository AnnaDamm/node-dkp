"use strict";

var mongojs = require("mongojs"),
    async   = require("async"),

    checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");

module.exports = function (mongo) {
    var dkpCollection  = mongo.collection('dkp'),
        userCollection = mongo.collection('users'),
        raidCollection = mongo.collection('raids'),
        functions      = require("./functions")(mongo);

    return function (req, res) {
        var userIds = [];
        async.waterfall([
            function validateUser(waterfallDone) {
                if (!req.session.user || !req.session.user.isAdmin) {
                    return waterfallDone(new Error("unauthorized"));
                }
                waterfallDone();
            },
            function validateForm(waterfallDone) {
                function checkExist(name) {
                    return req.body[name] && typeof req.body[name] === "string" && req.body[name].trim().length > 0;
                }

                if (!checkExist("raidId") || !req.body.raidId.match(checkForHexRegExp)) {
                    return waterfallDone(new Error("raidId"));
                }

                if (!req.body.dkp || typeof req.body.dkp !== "object" || Object.getOwnPropertyNames(req.body.dkp).length === 0) {
                    return waterfallDone(new Error("dkp"));
                }

                if (!checkExist("success") || (req.body.success !== "0" && req.body.success !== "1")) {
                    return waterfallDone(new Error("success"));
                }

                var okayIds = Object.getOwnPropertyNames(req.body.dkp).filter(function (userId) {
                    if (!userId.match(checkForHexRegExp)) {
                        return false;
                    }
                    if (isNaN(parseInt(req.body.dkp[userId], 10))) {
                        return false;
                    }
                    return true;
                });

                if (okayIds.length === 0) {
                    return waterfallDone(new Error("dkp"));
                }

                return waterfallDone();
            },
            function getData(waterfallDone) {
                var userData = [],
                    raidData;
                Object.getOwnPropertyNames(req.body.dkp).forEach(function (userId) {
                    userIds.push(mongojs.ObjectId(userId));
                });

                async.parallel([
                    function getUserData(parallelDone) {
                        userCollection.find({
                            _id: { $in: userIds }
                        }, function (error, userArray) {
                            if (error) {
                                return parallelDone(error);
                            }
                            userArray.forEach(function (user) {
                                userData.push({
                                    id:   user._id,
                                    name: user.characters[0].name,
                                    dkp:  parseInt(req.body.dkp[user._id], 10)
                                });
                            });
                            if (userData.length !== userIds.length) {
                                return parallelDone(new Error("a user was not found"));
                            }
                            parallelDone();
                        });
                    },
                    function getRaidData(parallelDone) {
                        raidCollection.findOne({
                            _id: mongojs.ObjectId(req.body.raidId)
                        }, function (error, raid) {
                            if (error) {
                                return parallelDone(error);
                            }
                            if (!raid) {
                                return parallelDone(new Error("raidId"));
                            }
                            raidData = {
                                id:   raid._id,
                                name: raid.name
                            };
                            parallelDone(error);
                        });
                    }
                ], function parallelDone(error) {
                    waterfallDone(error, userData, raidData);
                });
            },
            function setData(userData, raidData, waterfallDone) {
                var raidObjectId = mongojs.ObjectId(req.body.raidId);
                async.parallel([
                    function updateDkp(parallelDone) {
                        dkpCollection.update({
                            "raid.id": raidObjectId,
                            isRaidDkp: true
                        }, {
                            date: new Date(),
                            raid: raidData,
                            user: userData,
                            isRaidDkp: true
                        }, {
                            upsert: true // makes a new entry if none exists yet
                        }, function (error) {
                            parallelDone(error);
                        });
                    },
                    function updateRaidSuccess(parallelDone) {
                        raidCollection.update({
                            _id: raidObjectId
                        }, {
                            $set: { success: req.body.success === "1" }
                        }, function (error) {
                            parallelDone(error);
                        });
                    }
                ], function parallelDone(error) {
                    waterfallDone(error);
                });

            },

            function refreshUserDkp(waterfallDone) {
                functions.refreshUserDkps(userIds, waterfallDone);
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