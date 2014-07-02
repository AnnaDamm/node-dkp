"use strict";

var async     = require("async"),
    functions = require("./functions")();

module.exports = function (mongo) {
    var raidCollection = mongo.collection('raids');
    return function (req, res) {

        var startDate,
            endDate;
        async.waterfall([
            function validateParams(waterfallDone) {

                if (!req.query.from || !req.query.to || isNaN(parseInt(req.query.from, 10)) || isNaN(parseInt(req.query.to, 10))) {
                    return waterfallDone(new Error("invalid parameters"));
                }
                startDate = new Date(parseInt(req.query.from, 10));
                endDate   = new Date(parseInt(req.query.to, 10));

                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    return waterfallDone(new Error("invalid parameters"));
                }

                waterfallDone();
            },
            function checkLogin(waterfallDone) {
                raidCollection.find({ query: { date: { "$gte": startDate, "$lte": endDate}}, "$orderby": { date: 1 }}, function (error, raids) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    return waterfallDone(null, raids);
                });
            },
            function createEventArray(raids, waterfallDone) {
                var raidArray = [];
                raids.forEach(function (raid) {
                    var raidTime = raid.date.getTime(),
                        raidObject = {
                            id:         raid._id,
                            title:      raid.name,
                            url:        "#raid/" + raid._id,
                            "class":    "event-" + raid["class"],
                            start:      raidTime,
                            end:        raid.endDate ? raid.endDate.getTime() : raid.date.getTime() + 7200000,
                            isSignedUp: functions.isSignedUp(req.session.user.id, raid),
                            isAffirmed: functions.isAffirmed(req.session.user.id, raid)
                        };
                    raidArray.push(raidObject);
                });
                waterfallDone(null, raidArray);
            }
        ], function waterfallDone(error, raids) {
            if (error) {
                return res.json({
                    success: 0,
                    data: error.message
                });
            }
            return res.json({
                success: 1,
                result: raids
            });
        });

    };
};
