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

                if (req.body._id == null || typeof req.body._id !== "string") {
                    return waterfallDone(new Error("_id"));
                }
                if (!checkExist("type")) {
                    return waterfallDone(new Error("type"));
                }
                if (!checkExist("class")) {
                    return waterfallDone(new Error("class"));
                }
                if (!checkExist("date") || isNaN(parseInt(req.body.date, 10)) || parseInt(req.body.date, 10) < 0) {
                    return waterfallDone(new Error("date"));
                }
                if (!checkExist("enddate") || isNaN(parseInt(req.body.enddate, 10)) || parseInt(req.body.enddate, 10) < 0) {
                    return waterfallDone(new Error("enddate"));
                }
                if (!checkExist("name")) {
                    return waterfallDone(new Error("name"));
                }
                if (!checkExist("present") || isNaN(parseInt(req.body.present, 10)) || parseInt(req.body.present, 10) < 0) {
                    return waterfallDone(new Error("present"));
                }
                if (!checkExist("killbonus") || isNaN(parseInt(req.body.killbonus, 10)) || parseInt(req.body.killbonus, 10) < 0) {
                    return waterfallDone(new Error("killbonus"));
                }
                if (!checkExist("absent") || isNaN(parseInt(req.body.absent, 10)) || parseInt(req.body.absent, 10) < 0) {
                    return waterfallDone(new Error("absent"));
                }
                if (!req.body.roles || typeof req.body.roles !== "object") {
                    return waterfallDone(new Error("role"));
                }
                var roleCheck = true;
                Object.getOwnPropertyNames(req.body.roles).some(function (roleId) {
                    if (req.body.roles[roleId] == "") {
                        req.body.roles[roleId] = undefined;
                    } else {
                        req.body.roles[roleId] = parseInt(req.body.roles[roleId], 10);
                        if (isNaN(req.body.roles[roleId])) {
                            roleCheck = false;
                            waterfallDone(new Error("role-" + roleId));
                            return true;
                        }
                    }
                });
                if (!roleCheck) {
                    return;
                }
                if (req.body.roles.length === 0) {
                    return waterfallDone(new Error("role"));
                }

                return waterfallDone();
            },
            function insertIntoDatabase(waterfallDone) {
                var raid = {
                    name: req.body.name,
                    type: req.body.type,
                    "class": req.body["class"],
                    date: new Date(req.body.date * 1000),
                    endDate: new Date(req.body.enddate * 1000),
                    dkp: {
                        present: parseInt(req.body.present, 10),
                        killbonus: parseInt(req.body.killbonus, 10),
                        absent: -parseInt(req.body.absent, 10)
                    },
                    roles: req.body.roles
                };
                if (req.body._id === "") {
                    raidCollection.insert(raid, function (error, raidSetting) {
                        waterfallDone(error, raidSetting);
                    });
                } else {
                    raidCollection.update({_id: mongojs.ObjectId(req.body._id) }, { $set: raid }, function (error) {
                        raid._id = req.body._id;
                        waterfallDone(error, req.body);
                    });
                }
            }
        ], function waterfallDone(error, raidSetting) {
            if (error) {
                return res.json({
                    success: false,
                    data: error.message
                });
            }
            return res.json({
                success: true,
                raidSetting: raidSetting
            });
        });

    };
};