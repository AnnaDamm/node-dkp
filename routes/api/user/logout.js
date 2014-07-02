"use strict";

module.exports = function (mongo) {
    var userCollection = mongo.collection('users');
    return function (req, res) {
        if (req.session.user) {
            req.session.user = undefined;
            return res.json({
                success: true
            });
        }
        return res.json({
            success: false
        });
    };
};