"use strict";

var async   = require("async"),
    mongojs = require("mongojs");

module.exports = function (mongo) {
    var dkpCollection  = mongo.collection('dkp'),
        userCollection = mongo.collection('users');

    function refreshUserDkps(userIds, callback) {
        var userObjectIds = [];
        userIds.forEach(function (id) {
            userObjectIds.push(mongojs.ObjectId(id));
        });

        async.waterfall([
            function getDkpOfUsers(waterfallDone) {
                dkpCollection.aggregate(
                    { $match: { "user.id": { $in: userObjectIds } } },
                    { $project: { user: 1 } },
                    { $unwind: "$user" },
                    { $match: { "user.id": { $in: userObjectIds } } },
                    { $group: {
                        _id: "$user.id",
                        sum: { $sum: "$user.dkp"}
                    }},
                    function (error, dkp) {
                        waterfallDone(error, dkp);
                    }
                );
            },
            function updateDkpOfUsers(dkp, waterfallDone) {
                async.each(dkp, function (userDkp, eachDone) {
                    userCollection.update({
                        _id: mongojs.ObjectId(userDkp._id)
                    }, {
                        $set: { dkp: userDkp.sum }
                    }, eachDone);
                }, function eachDone(error) {
                    waterfallDone(error);
                });
            }
        ], function (error) {
            callback(error);
        });
    }

    return {
        refreshUserDkps: refreshUserDkps
    };
};