"use strict";

var mongojs = require("mongojs"),
    async   = require("async"),

    checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$"),
    checkForNewRegExp = new RegExp("^new-\\d+$");

module.exports = function (mongo) {
    var rolesCollection = mongo.collection('roles');
    return function (req, res) {

        async.waterfall([
            function validateUser(waterfallDone) {
                if (!req.session.user || !req.session.user.isAdmin) {
                    return waterfallDone(new Error("unauthorized"));
                }
                waterfallDone();
            },
            function validateForm(waterfallDone) {
                var isValid = true;

                if (!req.body["delete"] && !req.body.roles) {
                    return waterfallDone(new Error("Nothing set!"));
                }

                if (req.body["delete"]) {
                    if (Object.prototype.toString.call(req.body["delete"]) !== '[object Array]' ||
                            req.body["delete"].length === 0) {
                        return waterfallDone(new Error("delete"));
                    }
                    req.body["delete"].some(function (roleId) {
                        if (!roleId.match(checkForHexRegExp)) {
                            isValid = false;
                            return true;
                        }
                    });
                    if (!isValid) {
                        return waterfallDone(new Error("delete"));
                    }
                }

                if (req.body.roles) {
                    if (typeof req.body.roles !== "object" || Object.getOwnPropertyNames(req.body.roles).length === 0) {
                        return waterfallDone(new Error("delete"));
                    }
                    Object.getOwnPropertyNames(req.body.roles).some(function (roleId) {
                        var role = req.body.roles[roleId];
                        if (!roleId.match(checkForHexRegExp) && !roleId.match(checkForNewRegExp)) {
                            console.log("no match:", roleId);
                            isValid = false;
                            return true;
                        }
                        if (!role.hasOwnProperty("name") || !role.hasOwnProperty("rank") || isNaN(parseInt(role.rank, 10))) {
                            console.log("wrong value:", roleId);
                            isValid = false;
                            return true;
                        }
                    });
                    if (!isValid) {
                        return waterfallDone(new Error("roles"));
                    }
                }

                return waterfallDone();
            },
            function setData(waterfallDone) {
                async.parallel([
                    function deleteFromDatabase(parallelDone) {
                        if (!req.body["delete"]) {
                            return parallelDone();
                        }
                        var deleteIds = [];
                        req.body["delete"].forEach(function (deleteId) {
                            deleteIds.push(mongojs.ObjectId(deleteId));
                        });
                        rolesCollection.remove({
                            _id: { $in: deleteIds }
                        }, function (error) {
                            parallelDone(error);
                        });
                    },
                    function updateInDatabase(parallelDone) {
                        if (!req.body.roles) {
                            return parallelDone();
                        }
                        async.each(Object.getOwnPropertyNames(req.body.roles), function (roleId, eachDone) {
                            var role = req.body.roles[roleId],
                                roleObject = {
                                    name: role.name,
                                    rank: role.rank
                                };
                            if (roleId.match(checkForNewRegExp)) {
                                rolesCollection.insert(roleObject, function (error) {
                                    eachDone(error);
                                });
                            } else {
                                rolesCollection.update({
                                    _id: mongojs.ObjectId(roleId)
                                }, roleObject, function (error) {
                                    eachDone(error);
                                });
                            }
                        }, function eachDone(error) {
                            parallelDone(error);
                        });
                    }
                ], function parallelDone(error) {
                    waterfallDone(error);
                });
            },
            function getRoles(waterfallDone) {
                rolesCollection.find({
                    $query: {},
                    $orderby: { rank: 1}
                }, function (error, roles) {
                    var roleObject = {};
                    roles.forEach(function (role) {
                        roleObject[role._id] = role.name;
                    })
                    waterfallDone(error, roleObject);
                });
            }

        ], function waterfallDone(error, roles) {
            if (error) {
                return res.json({
                    success: false,
                    data: error.message
                });
            }
            return res.json({
                success: true,
                roles: roles
            });
        });

    };
};