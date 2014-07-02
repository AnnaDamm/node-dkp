"use strict";

var mongojs   = require("mongojs"),
    async     = require("async"),

    checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");

module.exports = function (mongo) {
    var dkpCollection  = mongo.collection('dkp'),
        userCollection = mongo.collection('users'),
        itemCollection = mongo.collection('items'),
        raidCollection = mongo.collection('raids'),
        functions      = require("./functions")(mongo);

    return function (req, res) {
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

                if (!checkExist("userId") || !req.body.userId.match(checkForHexRegExp)) {
                    return waterfallDone(new Error("userId"));
                }

                if (!checkExist("raidId") || !req.body.raidId.match(checkForHexRegExp)) {
                    return waterfallDone(new Error("raidId"));
                }

                if (!checkExist("itemId") || !req.body.itemId.match(checkForHexRegExp)) {
                    return waterfallDone(new Error("itemId"));
                }

                if (!checkExist("dkp") || isNaN(parseInt(req.body.dkp, 10)) || parseInt(req.body.dkp, 10) < 0) {
                    return waterfallDone(new Error("dkp"));
                }

                return waterfallDone();
            },

            function getData(waterfallDone) {
                var userData, raidData, itemData;
                async.parallel([
                    function getUserData(parallelDone) {
                        userCollection.findOne({ _id: mongojs.ObjectId(req.body.userId)}, function (error, user) {
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
                    function getRaidData(parallelDone) {
                        raidCollection.findOne({ _id: mongojs.ObjectId(req.body.raidId)}, function (error, raid) {
                            if (error) {
                                return parallelDone(error);
                            }
                            if (!raid) {
                                return parallelDone(new Error("raid not found"));
                            }
                            raidData = raid;
                            parallelDone();
                        });
                    },
                    function getItemData(parallelDone) {
                        itemCollection.findOne({ _id: mongojs.ObjectId(req.body.itemId)}, function (error, item) {
                            if (error) {
                                return parallelDone(error);
                            }
                            if (!item) {
                                return parallelDone(new Error("item not found"));
                            }
                            itemData = item;
                            parallelDone();
                        });
                    }
                ], function (error) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    waterfallDone(null, userData, raidData, itemData);
                });
            },

            function setDkp(userData, raidData, itemData, waterfallDone) {
                dkpCollection.insert({
                    date: new Date(),
                    user: [{
                        id:   mongojs.ObjectId(req.body.userId),
                        name: userData.characters[0].name,
                        dkp:  -parseInt(req.body.dkp, 10)
                    }],
                    raid: {
                        id: raidData._id,
                        name: raidData.name
                    },
                    item: {
                        id:   req.body.itemId,
                        name: itemData.name,
                        wasNeed: typeof req.body.need === "string" && req.body.need === "1"
                    }
                }, function (error) {
                    waterfallDone(error);
                });
            },

            function refreshUserDkp(waterfallDone) {
                functions.refreshUserDkps([req.body.userId], waterfallDone);
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