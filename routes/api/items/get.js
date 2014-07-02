"use strict";

var async  = require("async");

module.exports = function (mongo) {
    var itemCollection = mongo.collection('items');
    return function (req, res) {

        async.waterfall([
            function checkLogin(waterfallDone) {
                itemCollection.find({ $query: {}, "$orderby": { name: 1 }}, function (error, items) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    return waterfallDone(null, items);
                });
            }
        ], function waterfallDone(error, items) {
            if (error) {
                return res.json({
                    success: false,
                    data: error.message
                });
            }
            return res.json({
                success: true,
                items: items
            });
        });

    };
};