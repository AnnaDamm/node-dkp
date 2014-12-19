"use strict";

var mongojs   = require("mongojs"),
    async     = require("async"),

    checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$"),
    raidFunctions = require("../raids/functions")();

module.exports = function (mongo) {
    var dkpCollection  = mongo.collection('dkp'),
        userCollection = mongo.collection('users'),
        raidCollection = mongo.collection('raids');

    return function (req, res) {
        async.waterfall([
            function validateForm(waterfallDone) {
                function checkExist(name) {
                    return req.body[name] && typeof req.body[name] === "string" && req.body[name].trim().length > 0;
                }

                if (!checkExist("userId") || !req.body.userId.match(checkForHexRegExp)) {
                    return waterfallDone(new Error("userId"));
                }

                return waterfallDone();
            },

            function getData(waterfallDone) {
                var userId = mongojs.ObjectId(req.body.userId),
                    userData,
                    dkpData;
                async.parallel([
                    function getUserData(parallelDone) {
                        userCollection.findOne({ _id: userId}, function (error, user) {
                            if (error) {
                                return parallelDone(error);
                            }
                            if (!user) {
                                return parallelDone(new Error("user not found"));
                            }
                            userData = user;
                            parallelDone();
                        });
                    },
                    function getDkpData(parallelDone) {
                        dkpCollection.find({
                            $query: { "user.id": userId},
                            $orderby: { date: -1}
                        }, function (error, dkp) {
                            if (error) {
                                return parallelDone(error);
                            }
                            dkpData = dkp;
                            parallelDone();
                        });
                    }
                ], function (error) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    waterfallDone(null, userData, dkpData);
                });
            },
            function makeHistoryArray(userData, dkpData, waterfallDone) {
                var historyArray = [],
                    currentDkp   = userData.dkp,
                    raidIds = [];
                dkpData.forEach(function (dkp) {
                    var historyObject = {
                        date: dkp.date,
                        raid: dkp.raid,
                        role: null,
                        item: dkp.item,
                        change: 0,
                        newDkp: 0
                    };
                    raidIds.push(mongojs.ObjectId(dkp.raid.id));
                    dkp.user.some(function (user) {
                        if (user.id.toString() === req.body.userId) {
                            historyObject.change = user.dkp;
                            historyObject.newDkp = currentDkp;
                            currentDkp = currentDkp - user.dkp;
                            return true;
                        }
                    });

                    if (historyObject.change !== 0 || dkp.item) {
                        historyArray.push(historyObject);
                    }
                });
                waterfallDone(null, raidIds, historyArray);
            },
            function getRaidRoles(raidIds, history, waterfallDone) {
                if (raidIds.length === 0) {
                    return waterfallDone(null, history);
                }
                raidCollection.find({
                    _id: { $in: raidIds},
                    affirmed: { $exists: true}
                }, function (error, raids) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    var raidsById = {};
                    raids.forEach(function (raid) {
                        raidsById[raid._id] = raid;
                    });
                    history.forEach(function (historyObject) {
                        if (raidsById[historyObject.raid.id]) {
                            historyObject.role = raidFunctions.getRole(req.body.userId, raidsById[historyObject.raid.id].affirmed);
                        }
                    });
                    waterfallDone(null, history);
                });
            }

        ], function waterfallDone(error, history) {
            if (error) {
                return res.json({
                    success: false,
                    data: error.message
                });
            }
            return res.json({
                success: true,
                history: history
            });
        });

    };
};