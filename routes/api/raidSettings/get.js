"use strict";

var async  = require("async");

module.exports = function (mongo) {
    var raidSettingCollection = mongo.collection('raidSettings');
    return function (req, res) {

        async.waterfall([
            function checkLogin(waterfallDone) {
                raidSettingCollection.find({ query: {}, "$orderby": { name: 1 }}, function (error, raidSettings) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    return waterfallDone(null, raidSettings);
                });
            }
        ], function waterfallDone(error, raidSettings) {
            if (error) {
                return res.json({
                    success: false,
                    data: error.message
                });
            }
            return res.json({
                success: true,
                raidSettings: raidSettings
            });
        });

    };
};