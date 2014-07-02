"use strict";

var async   = require("async"),
    mongojs = require("mongojs");

module.exports = function (mongo) {
    var userCollection = mongo.collection('users');
    return function (req, res) {

        async.waterfall([
            function validateUser(waterfallDone) {
                if (!req.session.user) {
                    return waterfallDone(new Error("unauthorized"));
                }
                waterfallDone();
            },

            function getUser(waterfallDone) {
                userCollection.findOne({
                    _id: mongojs.ObjectId(req.session.user.id)
                }, {
                    _id: false,
                    dkp: true
                }, function (error, user) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    if (!user) {
                        return waterfallDone(new Error("user not found"));
                    }
                    waterfallDone(null, user.dkp);
                });
            },

            function insertIntoSession(dkp, waterfallDone) {
                req.session.user.dkp = dkp;
                waterfallDone(null, dkp);
            }
        ], function waterfallDone(error, dkp) {
            if (error) {
                return res.json({
                    success: false,
                    data: error.message
                });
            }
            return res.json({
                success: true,
                dkp: dkp
            });
        });

    };
};