"use strict";

var async   = require("async"),
    mongojs = require("mongojs"),

    checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");

module.exports = function (mongo) {
    var commentsCollection = mongo.collection('comments');

    return function (req, res) {

        async.waterfall([
            function validateParams(waterfallDone) {

                if (!req.body.raidId || typeof req.body.raidId !== "string" ||
                        !req.body.raidId.match(checkForHexRegExp)) {
                    return waterfallDone(new Error("invalid parameters"));
                }

                waterfallDone();
            },

            function findComments(waterfallDone) {
                commentsCollection.find({
                    $query: {
                        "raid.id": mongojs.ObjectId(req.body.raidId)
                    },
                    $orderby: {
                        date: 1
                    }
                }, function (error, comments) {
                    waterfallDone(error, comments);
                });
            }
        ], function waterfallDone(error, comments) {
            if (error) {
                return res.json({
                    success: false,
                    data: error.message
                });
            }
            return res.json({
                success: true,
                comments: comments
            });
        });

    };
};