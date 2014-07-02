"use strict";

var mongojs   = require("mongojs"),
    async     = require("async"),

    checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");

module.exports = function (mongo) {
    var dkpCollection  = mongo.collection('dkp'),
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

                if (!checkExist("id") || !req.body.id.match(checkForHexRegExp)) {
                    return waterfallDone(new Error("itemId"));
                }

                return waterfallDone();
            },

            function getData(waterfallDone) {
                dkpCollection.findOne({ _id: mongojs.ObjectId(req.body.id)}, function (error, dkpEntry) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    if (!dkpEntry) {
                        return waterfallDone(new Error("entry not found"));
                    }
                    waterfallDone(null, dkpEntry.user[0].id);
                });
            },

            function removeItem(userId, waterfallDone) {
                dkpCollection.remove({ _id: mongojs.ObjectId(req.body.id)}, function (error) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    waterfallDone(null, userId);
                });
            },

            function refreshUserDkp(userId, waterfallDone) {
                functions.refreshUserDkps([userId], waterfallDone);
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