"use strict";

module.exports = function (mongo) {
    return function (req, res) {
        res.redirect(303, "./");
    };
};