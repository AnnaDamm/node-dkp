"use strict";

var mongojs = require("mongojs"),
    async   = require("async"),
    uuid    = require("node-uuid"),

    path           = require('path'),
    templatesDir   = path.join(__dirname, "../../../", "emailTemplates"),
    emailTemplates = require('email-templates'),
    nodemailer     = require('nodemailer');

module.exports = function (mongo, config) {
    var userCollection = mongo.collection('users');
    return function (req, res) {

        async.waterfall([
            function validateForm(waterfallDone) {
                function checkExist(name) {
                    return req.body[name] && typeof req.body[name] === "string" && req.body[name].trim().length > 0;
                }

                if (!checkExist("email")) {
                    return waterfallDone(new Error("email"));
                }

                return waterfallDone();
            },

            function checkEmail(waterfallDone) {
                userCollection.findOne({email: req.body.email}, function (error, user) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    if (!user) {
                        return waterfallDone(new Error("email"));
                    }
                    waterfallDone(null, user);
                });
            },
            function addRandomNumber(user, waterfallDone) {
                var resetHash = uuid.v4();
                userCollection.update({_id: mongojs.ObjectId(user._id)}, { $set: {
                    passwordReset: {
                        hash: resetHash,
                        timeout: Date.now() + 8640000 // one day
                    }
                }}, function (error) {
                    waterfallDone(error, user, resetHash);
                });
            },
            function sendEmail(user, resetHash, waterfallDone) {
                var resetUrl = req.protocol + "://" + config.hostname + "/#resetPassword/" + resetHash,
                    transport = nodemailer.createTransport("SMTP", {
                        host: config.smtp.host,
                        port: config.smtp.port,
                        auth: {
                            user: config.smtp.user,
                            pass: config.smtp.password
                        }
                    });

                emailTemplates(templatesDir, function (error, template) {
                    if (error) {
                        console.log(error);
                        return waterfallDone(error);
                    }
                    template("passwordReset", {
                        name: user.name,
                        resetUrl: resetUrl
                    }, function (error, html, text) {
                        if (error) {
                            console.log(error);
                            return waterfallDone(error);
                        }
                        transport.sendMail({
                            from:    config.smtp.from,
                            to:      user.email,
                            subject: "Passwort zurücksetzen",
                            html:    html,
                            text:    text
                        }, function (error) {
                            if (error) {
                                console.log(error);
                                return waterfallDone(error);
                            }
                            waterfallDone();
                        });
                        waterfallDone();
                    });
                });
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