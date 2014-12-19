"use strict";

var async   = require("async"),
    mongojs = require("mongojs");

module.exports = function (mongo, config, settings) {
    var raidCollection      = mongo.collection('raids'),
        dkpCollection       = mongo.collection('dkp'),
        userCollection      = mongo.collection('users'),
        settingsCollection  = mongo.collection('raidSettings'),
        itemCollection      = mongo.collection('items'),
        commentsCollection  = mongo.collection('comments');

    return function (req, res) {

        async.waterfall([
            function validateParams(waterfallDone) {

                if (!req.body.id || typeof req.body.id !== "string" || req.body.id.trim().length === 0) {
                    return waterfallDone(new Error("invalid parameters"));
                }

                waterfallDone();
            },
            function getData(waterfallDone) {
                var raidId = mongojs.ObjectId(req.body.id),
                    raidData,
                    raidDkp,
                    raidItems,
                    userList;

                async.parallel([
                    function getRaidData(parallelDone) {
                        raidCollection.findOne({ _id: raidId}, function (error, raid) {
                            if (error) {
                                return parallelDone(error);
                            }
                            if (!raid) {
                                return parallelDone(new Error("raid not found"));
                            }
                            raidData = raid;
                            return parallelDone();
                        });
                    },
                    function getRaidDkp(parallelDone) {
                        dkpCollection.find({"raid.id": raidId}, function (error, dkpDocuments) {
                            if (error) {
                                parallelDone(error);
                            }
                            raidItems = [];
                            dkpDocuments.forEach(function (dkpData) {
                                if (dkpData.isRaidDkp) {
                                    raidDkp = {};
                                    // dkp for raid given
                                    dkpData.user.forEach(function (userDkp) {
                                        raidDkp[userDkp.id] = {
                                            name: userDkp.name,
                                            dkp:  userDkp.dkp
                                        };
                                    });
                                } else {
                                    // item given
                                    dkpData.user.forEach(function (userDkp) {
                                        raidItems.push({
                                            id:   dkpData._id,
                                            user: userDkp,
                                            item: dkpData.item
                                        });
                                    });
                                }
                            });

                            raidItems.sort(function (itemA, itemB) {
                                if (itemA.user.dkp === itemB.user.dkp) {
                                    if (itemA.item.wasNeed && itemB.item.wasNeed) {
                                        if (itemA.item.name === itemB.item.name) {
                                            return itemA.user.name < itemB.user.name ? -1 : 1;
                                        }
                                        return itemA.item.name < itemB.item.name ? -1 : 1;
                                    }
                                    return itemA.item.wasNeed ? 1 : -1;
                                }
                                return itemA.user.dkp - itemB.user.dkp;
                            });

                            parallelDone();
                        });
                    },
                    function getAllCharacters(parallelDone) {
                        if (req.session.user.isAdmin) {
                            userCollection.aggregate(
                                { $unwind: "$characters" },
                                { $project: {"name": "$characters.name" } },

                                function (error, users) {
                                    if (error) {
                                        return parallelDone(error);
                                    }
                                    if (!users) {
                                        return parallelDone();
                                    }

                                    userList = [];
                                    users.forEach(function (user) {
                                        userList.push(user.name);
                                    });
                                    parallelDone();
                                }
                            );
                        } else {
                            parallelDone();
                        }
                    }
                ], function parallelDone(error) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    raidData.dkpGiven   = raidDkp;
                    raidData.itemsGiven = raidItems;
                    raidData.userList   = userList;
                    waterfallDone(null, raidData);
                });
            },
            function getAdditionalData(raid, waterfallDone) {
                var userIds = [];
                function addUserIds(array) {
                    var roleId, userId;
                    for (roleId in array) {
                        if (array.hasOwnProperty(roleId)) {
                            for (userId in array[roleId]) {
                                if (array[roleId].hasOwnProperty(userId) && userIds.indexOf(userId) < 0) {
                                    userIds.push(mongojs.ObjectId(userId));
                                }
                            }
                        }
                    }
                }
                addUserIds(raid.affirmed);

                async.parallel([
                    function getItemNeededThreshold(parallelDone) {
                        settings.get("itemNeedThreshold", function (error, itemNeededThreshold) {
                            raid.itemNeededThreshold = itemNeededThreshold;
                            parallelDone();
                        });
                    },
                    function getUserDkp(parallelDone) {
                        userCollection.find({
                            _id: {
                                $in: userIds
                            }
                        }, function (error, users) {
                            if (error) {
                                return waterfallDone(error);
                            }
                            raid.userDkp = {};

                            users.forEach(function (user) {
                                raid.userDkp[user._id] = user.dkp;
                            });

                            parallelDone();
                        });
                    },
                    function getRaidItems(parallelDone) {
                        settingsCollection.findOne({ _id: mongojs.ObjectId(raid.type)}, function (error, raidSettings) {
                            if (error) {
                                return parallelDone(error);
                            }
                            if (!raidSettings) {
                                return parallelDone(new Error("raid settings not found"));
                            }
                            if (!raidSettings.items || raidSettings.items.length === 0) {
                                return parallelDone();
                            }

                            var itemIds = [];
                            raidSettings.items.forEach(function (itemId) {
                                itemIds.push(mongojs.ObjectId(itemId));
                            });

                            itemCollection.find({
                                query: { _id: { $in: itemIds } },
                                $orderby: { name: 1}
                            }, function (error, itemData) {
                                if (error) {
                                    return parallelDone(error);
                                }
                                var items = {};
                                itemData.forEach(function (item) {
                                    items[item._id] = item;
                                });
                                raid.items = items;
                                parallelDone();
                            });
                        });
                    },
                    function getCommentAmount(parallelDone) {
                        commentsCollection.aggregate([
                            { $match: {
                                "raid.id": mongojs.ObjectId(req.body.id)
                            }},
                            { $group: {
                                _id: null, amount: { $sum: 1 }
                            }}
                        ], function (error, data) {
                            if (error) {
                                return parallelDone(error);
                            }
                            raid.commentAmount = data && data.length === 1 ? data[0].amount : 0;

                            parallelDone();
                        });
                    }
                ], function (error) {
                    waterfallDone(error, raid, userIds);
                });
            },
            function getUserItems(raid, userIds, waterfallDone) {
                if (!raid.items || Object.getOwnPropertyNames(raid.items).length === 0) {
                    return waterfallDone(null, raid);
                }
                dkpCollection.find({
                    $query: {
                        "user.id": { $in: userIds},
                        "item.id": { $in:  Object.getOwnPropertyNames(raid.items)}
                    },
                    $orderby: {
                        "item.name": 1
                    }
                }, function (error, dkpArray) {
                    if (error) {
                        return parallelDone(error);
                    }
                    var userItems = {};
                    dkpArray.forEach(function (dkp) {
                        if (!userItems[dkp.user[0].id]) {
                            userItems[dkp.user[0].id] = {};
                        }
                        if (!userItems[dkp.user[0].id][dkp.item.id]) {
                            userItems[dkp.user[0].id][dkp.item.id] = {
                                name:     dkp.item.name,
                                userName: dkp.user[0].name,
                                amount:   1
                            };
                        } else {
                            userItems[dkp.user[0].id][dkp.item.id].amount = userItems[dkp.user[0].id][dkp.item.id].amount + 1;
                        }
                    });
                    raid.userItems = userItems;
                    waterfallDone(null, raid);
                });
            },
        ], function waterfallDone(error, raid) {
            if (error) {
                return res.json({
                    success: false,
                    data: error.message
                });
            }
            return res.json({
                success: true,
                raid: raid
            });
        });

    };
};