"use strict";

var mongojs = require("mongojs"),
    async   = require("async");

module.exports = function (mongo) {
    var raidCollection = mongo.collection('raids');
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

                if (!checkExist("_id")) {
                    return waterfallDone(new Error("_id"));
                }

                return waterfallDone();
            },
            function deleteFromDatabase(waterfallDone) {
                raidCollection.remove({_id: mongojs.ObjectId(req.body._id)}, function (error) {
                    waterfallDone(error);
                });
            }
        ], function waterfallDone(error, raidSetting) {
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