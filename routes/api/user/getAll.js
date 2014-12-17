"use strict";

var async  = require("async"),
    crypto = require("crypto");

module.exports = function (mongo) {
    var userCollection = mongo.collection('users');
    return function (req, res) {

        async.waterfall([
            function getUsers(waterfallDone) {

                var dataToFetch = req.session.user.isAdmin ? {} : {
                    _id: 1,
                    characters: 1,
                    dkp: 1
                };

                userCollection.find({
                    $query: {},
                    $orderby: { "characters.name": 1 }
                }, dataToFetch, waterfallDone);
            },
            function sortUsers(users, waterfallDone) {
                users.sort(function (userA, userB) {
                    return userA.characters[0].name.toLowerCase() > userB.characters[0].name.toLowerCase() ? 1 : -1;
                });
                waterfallDone(null, users);
            }
        ], function waterfallDone(error, users) {
            if (error) {
                return res.json({
                    success: false,
                    data: error.message
                });
            }
            return res.json({
                success: true,
                users: users
            });
        });

    };
};