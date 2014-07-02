"use strict";

var commentEveryXSeconds = 180,

    async   = require("async"),
    mongojs = require("mongojs"),

    checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");

module.exports = function (mongo) {
    var raidsCollection    = mongo.collection("raids"),
        commentsCollection = mongo.collection("comments");

    return function (req, res) {

        async.waterfall([
            function validateParams(waterfallDone) {
                if (!req.session.user) {
                    return waterfallDone(new Error("unauthorized"));
                }

                if (!req.body.raidId || typeof req.body.raidId !== "string" ||
                        !req.body.raidId.match(checkForHexRegExp)) {
                    return waterfallDone(new Error("raidId not given"));
                }

                if (!req.body.comment || typeof req.body.comment !== "string" ||
                        req.body.comment.trim().length < 10 || req.body.comment.length > 1024) {
                    return waterfallDone(new Error("invalid parameter comment"));
                }

                waterfallDone();
            },

            function findRaid(waterfallDone) {
                raidsCollection.findOne({
                    _id: mongojs.ObjectId(req.body.raidId)
                }, function (error, raid) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    if (!raid) {
                        return waterfallDone(new Error("raid not found"));
                    }
                    waterfallDone(null, raid);
                });
            },

            function findLastComment(raid, waterfallDone) {
                var date = new Date();
                date.setTime(date.getTime() - commentEveryXSeconds * 1000);
                commentsCollection.findOne({
                    "user.id": mongojs.ObjectId(req.session.user.id),
                    date: {
                        $gt: date
                    }
                }, function (error, comment) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    if (comment) {
                        return waterfallDone(new Error("please wait " + Math.ceil(commentEveryXSeconds / 60) + " minutes between each comment."));
                    }
                    waterfallDone(null, raid);
                });
            },

            function addComment(raid, waterfallDone) {
                var comment = {
                    raid: {
                        id:   raid._id,
                        name: raid.name
                    },
                    user: {
                        id:   mongojs.ObjectId(req.session.user.id),
                        name: req.session.user.characters[0].name
                    },
                    date: new Date(),
                    text: req.body.comment.trim()
                };
                commentsCollection.insert(comment, function (error) {
                    waterfallDone(error);
                });
            },

            function getComments(waterfallDone) {
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