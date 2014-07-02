"use strict";

var mongojs = require("mongojs"),
    async   = require("async"),
    checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");

module.exports = function (mongo) {
    var raidSettingCollection = mongo.collection('raidSettings');
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
                var roleCheck = true,
                    itemCheck = true;

                if (req.body._id == null || typeof req.body._id !== "string") {
                    return waterfallDone(new Error("_id"));
                }
                if (!checkExist("name")) {
                    return waterfallDone(new Error("name"));
                }
                if (!checkExist("class")) {
                    return waterfallDone(new Error("class"));
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
                if (!req.body.roles || typeof req.body.roles !== "object" || req.body.roles.length === 0) {
                    return waterfallDone(new Error("role"));
                }
                if (req.body.isDefault && (typeof req.body.isDefault !== "string" || req.body.isDefault !== "1")) {
                    return waterfallDone(new Error("isDefault"));
                }

                if (req.body.items) {
                    if (!Array.isArray(req.body.items)) {
                        return waterfallDone(new Error("items"));
                    }

                    req.body.items.some(function (itemString) {
                        if (!itemString.match(checkForHexRegExp)) {
                            itemCheck = false;
                            return true;
                        }
                    });
                }
                if (!itemCheck) {
                    return waterfallDone(new Error("items"));
                }

                Object.getOwnPropertyNames(req.body.roles).some(function (roleId) {
                    if (req.body.roles[roleId] === "") {
                        req.body.roles[roleId] = 0;
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

                return waterfallDone();
            },
            function resetOtherDefaults(waterfallDone) {
                if (!req.body.isDefault) {
                    return waterfallDone();
                }
                raidSettingCollection.update({
                    isDefault: true
                }, {
                    $unset: {
                        isDefault: ""
                    }
                }, function (error, document) {
                    waterfallDone(error);
                });
            },
            function insertIntoDatabase(waterfallDone) {
                var raidSetting = {
                    name: req.body.name,
                    "class": req.body["class"],
                    dkp: {
                        present: parseInt(req.body.present, 10),
                        killbonus: parseInt(req.body.killbonus, 10),
                        absent: -parseInt(req.body.absent, 10)
                    },
                    roles: req.body.roles,
                    items: req.body.items
                };
                if (req.body.isDefault) {
                    raidSetting.isDefault = true;
                }
                if (req.body._id === "") {
                    raidSettingCollection.insert(raidSetting, function (error, raidSetting) {
                        waterfallDone(error, raidSetting);
                    });
                } else {
                    raidSettingCollection.update({_id: mongojs.ObjectId(req.body._id) }, raidSetting, function (error) {
                        raidSetting._id = mongojs.ObjectId(req.body._id);
                        waterfallDone(error, raidSetting);
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