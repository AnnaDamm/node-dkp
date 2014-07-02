"use strict";

var mongojs = require("mongojs"),
    async   = require("async");

module.exports = function (mongo) {
    var itemCollection = mongo.collection('items');
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
                if (!checkExist("name")) {
                    return waterfallDone(new Error("name"));
                }
                if (!checkExist("needcosts") || isNaN(parseInt(req.body.needcosts, 10)) || parseInt(req.body.needcosts, 10) < 0) {
                    return waterfallDone(new Error("needcosts"));
                }
                if (!checkExist("greedcosts") || isNaN(parseInt(req.body.greedcosts, 10)) || parseInt(req.body.greedcosts, 10) < 0) {
                    return waterfallDone(new Error("greedcosts"));
                }

                return waterfallDone();
            },
            function insertIntoDatabase(waterfallDone) {
                var item = {
                    name: req.body.name,
                    dkp: {
                        need: -parseInt(req.body.needcosts, 10),
                        greed: -parseInt(req.body.greedcosts, 10)
                    }
                }
                if (req.body._id === "") {
                    itemCollection.insert(item, function (error, item) {
                        waterfallDone(error, item);
                    });
                } else {
                    itemCollection.update({_id: mongojs.ObjectId(req.body._id) }, item, function (error) {
                        item._id = req.body._id;
                        waterfallDone(error, item);
                    });
                }
            }
        ], function waterfallDone(error, item) {
            if (error) {
                return res.json({
                    success: false,
                    data: error.message
                });
            }
            return res.json({
                success: true,
                item: item
            });
        });

    };
};