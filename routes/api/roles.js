"use strict";

var async  = require("async");

module.exports = function (mongo) {
    var roleCollection = mongo.collection('roles');
    return function (req, res) {

        async.waterfall([
            function getoles(waterfallDone) {
                roleCollection.find({ }, function (error, roles) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    return waterfallDone(null, roles);
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