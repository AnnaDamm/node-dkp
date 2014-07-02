"use strict";

var async     = require("async"),
    mongojs   = require("mongojs"),
    functions = require("./functions")(),


    possibleTypes = {
        "signUp": {
            fields: ["roleId"],
            onlyAdmin: false
        },
        "removeSignUp": {
            fields: ["roleId"],
            onlyAdmin: false
        },
        "affirm": {
            fields: ["charId", "roleId"],
            onlyAdmin: true
        },
        "addAffirm": {
            fields: ["roleId"],
            stringFields: ["charName"],
            onlyAdmin: true
        },
        "removeAffirmation": {
            fields: ["charId"],
            onlyAdmin: true
        }
    },

    checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");

module.exports = function (mongo) {
    var raidCollection = mongo.collection('raids'),
        userCollection = mongo.collection('users');


    function getUserData(charId, callback) {
        userCollection.findOne({_id: mongojs.ObjectId(charId)}, function (error, user) {
            callback(error, user);
        });
    }

    function insertCharIntoSet(raidId, charId, charName, roleId, setName, wasAffirmed, callback) {
        function getQueryObject(fieldNameArray, useAffirmed) {
            var queryObject = {"_id": raidId};

            if (!(useAffirmed && wasAffirmed)) {
                queryObject[fieldNameArray.join(".")] = { $exists: false };
            }

            return queryObject;
        }

        function getSetObject(fieldNameArray, valueToSet) {
            var setObject = {};
            valueToSet = valueToSet || {};

            setObject[fieldNameArray.join(".")] = valueToSet;
            return { $set: setObject };
        }

        var fieldNameArray = [setName];

        function updateCollection(valueToPush, valueToSet, useAffirmed, callback) {
            if (valueToPush) {
                fieldNameArray.push(valueToPush);
            }
            if (valueToSet) {
                valueToSet = {
                    name: valueToSet,
                    date: new Date()
                };
                if (wasAffirmed) {
                    valueToSet.wasAffirmed = true;
                }
            }
            raidCollection.update(getQueryObject(fieldNameArray, useAffirmed), getSetObject(fieldNameArray, valueToSet), function (error) {
                callback(error);
            });
        }

        async.waterfall([
            function insertSet(waterfallDone) {
                updateCollection(null, null, false, waterfallDone);
            },
            function insertRoleIntoSet(waterfallDone) {
                updateCollection(roleId, null, false, waterfallDone);
            },
            function insertCharIntoRoleSet(waterfallDone) {
                updateCollection(charId, charName, true, waterfallDone);
            }
        ], function waterfallDone(error) {
            callback(error);
        });
    }

    function removeCharFromSet(raidId, charId, roleId, setName, callback) {
        var unsetObject = {},
            fieldName   = [setName, roleId, charId].join(".");

        unsetObject[fieldName] = "";

        raidCollection.update({"_id": raidId}, { $unset: unsetObject}, function (error) {
            callback(error);
        });
    }

    return function (req, res) {
        function signUp(raid, callback) {
            if (functions.isSignedUpAs(req.session.user.id, raid, req.body.roleId)) {
                return callback(new Error("already signed up"));
            }
            insertCharIntoSet(
                raid._id,
                req.session.user.id,
                req.session.user.characters[0].name,
                req.body.roleId,
                "signedUp",
                null,
                callback
            );
        }

        function removeSignUp(raid, callback) {
            var roleIds = [];
            if (req.body.roleId === "000000000000000000000000") {
                roleIds = functions.getRoles(req.session.user.id, raid.signedUp);
                if (roleIds.length === 0) {
                    roleIds.push(req.body.roleId);
                }
            } else {
                roleIds.push(req.body.roleId);
            }

            async.each(roleIds, function (roleId, eachDone) {
                async.parallel([
                    function removeFromSignup(parallelDone) {
                        removeCharFromSet(
                            raid._id,
                            req.session.user.id,
                            roleId,
                            "signedUp",
                            parallelDone
                        );
                    },
                    function removeFromAffirmation(parallelDone) {
                        removeCharFromSet(
                            raid._id,
                            req.session.user.id,
                            roleId,
                            "affirmed",
                            parallelDone
                        );
                    },
                    function insertIntoSignedOffArray(parallelDone) {
                        insertCharIntoSet(
                            raid._id,
                            req.session.user.id,
                            req.session.user.characters[0].name,
                            roleId,
                            "signedOff",
                            functions.isAffirmed(req.session.user.id, raid),
                            parallelDone
                        );
                    }
                ], function parallelDone(error) {
                    eachDone(error);
                });
            }, function eachDone(error) {
                callback(error);
            });

        }

        function affirm(raid, callback) {
            if (!functions.isSignedUpAs(req.body.charId, raid, req.body.roleId)) {
                return callback(new Error("not signed up"));
            }
            if (functions.isAffirmed(req.body.charId, raid)) {
                return callback(new Error("already affirmed"));
            }
            getUserData(req.body.charId, function (error, user) {
                if (error) {
                    return callback(error);
                }
                if (!user) {
                    return callback(new Error("could not find user"));
                }
                insertCharIntoSet(
                    raid._id,
                    req.body.charId,
                    user.characters[0].name,
                    req.body.roleId,
                    "affirmed",
                    null,
                    callback
                );
            });
        }

        function addAffirm(raid, callback) {
            userCollection.findOne({"characters.name": req.body.charName.trim()}, function (error, user) {
                if (error) {
                    return callback(error);
                }
                if (!user) {
                    return callback(new Error("could not find user"));
                }
                if (functions.isAffirmed(user._id.toString(), raid)) {
                    return callback(new Error("already affirmed"));
                }

                insertCharIntoSet(
                    raid._id,
                    user._id.toString(),
                    user.characters[0].name,
                    req.body.roleId,
                    "affirmed",
                    null,
                    callback
                );
            });
        }

        function removeAffirmation(raid, callback) {
            var role = functions.getRole(req.body.charId, raid.affirmed);
            if (role === null) {
                return callback(new Error("not affirmed"));
            }
            removeCharFromSet(
                raid._id,
                req.body.charId,
                role,
                "affirmed",
                callback
            );
        }

        async.waterfall([
            function validateLogin(waterfallDone) {
                if (!req.session.user) {
                    return waterfallDone(new Error("unauthorized"));
                }
                return waterfallDone();
            },
            function validateParams(waterfallDone) {
                function checkExist(name) {
                    return req.body[name] && typeof req.body[name] === "string" && req.body[name].trim().length > 0;
                }

                if (!checkExist("type") || !possibleTypes[req.body.type]) {
                    return waterfallDone(new Error("type"));
                }
                if (!checkExist("raidId") || !req.body.raidId.match(checkForHexRegExp)) {
                    return waterfallDone(new Error("raidId"));
                }

                if (possibleTypes[req.body.type].onlyAdmin && !req.session.user.isAdmin) {
                    return waterfallDone(new Error("unauthorized"));
                }
                var typesOk = true;
                possibleTypes[req.body.type].fields.forEach(function (field) {
                    if (!checkExist(field) || !req.body[field].match(checkForHexRegExp)) {
                        console.log(field);
                        typesOk = false;
                    }
                });

                if (possibleTypes[req.body.type].stringFields) {
                    possibleTypes[req.body.type].stringFields.forEach(function (field) {
                        if (!checkExist(field)) {
                            typesOk = false;
                        }
                    });
                }

                if (!typesOk) {
                    return waterfallDone(new Error("invalid parameters"));
                }

                return waterfallDone();
            },
            function getRaidData(waterfallDone) {
                raidCollection.findOne({_id: mongojs.ObjectId(req.body.raidId)}, function (error, raid) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    if (!raid) {
                        return waterfallDone(new Error("raid not found"));
                    }
                    return waterfallDone(null, raid);
                });
            },

            function doAction(raidData, waterfallDone) {
                var functions = {
                    signUp: signUp,
                    removeSignUp: removeSignUp,
                    affirm: affirm,
                    addAffirm: addAffirm,
                    removeAffirmation: removeAffirmation
                };
                functions[req.body.type](raidData, waterfallDone);
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