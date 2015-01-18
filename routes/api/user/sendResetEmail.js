"use strict";

var mongojs = require("mongojs"),
    async   = require("async"),
    uuid    = require("node-uuid"),

    path           = require('path'),
    emailTemplates = require('email-templates'),
    nodemailer     = require('nodemailer'),

    templatesDir = path.join(__dirname, "../../../", "emailTemplates");

module.exports = function (mongo, config, settings, translate) {
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
            function getSmtpSettings(user, resetHash, waterfallDone) {
                settings.get("smtp", function (error, smtp) {
                    waterfallDone(null, user, resetHash, smtp);
                });
            },
            function sendEmail(user, resetHash, smtp, waterfallDone) {
                var resetUrl = req.protocol + "://" + config.hostname + "/#resetPassword/" + resetHash,
                    transport = nodemailer.createTransport("SMTP", {
                        host: smtp.host,
                        port: smtp.port,
                        auth: {
                            user: smtp.user,
                            pass: smtp.password
                        }
                    });

                emailTemplates(templatesDir, function (error, template) {
                    if (error) {
                        return waterfallDone(error);
                    }
                    template("passwordReset", {
                        name: user.login,
                        resetUrl: resetUrl,
                        translate: function (key) {
                            return translate.translate(key, req.params.language)
                        }
                    }, function (error, html, text) {
                        if (error) {
                            return waterfallDone(error);
                        }
                        transport.sendMail({
                            from:    smtp.from,
                            to:      user.email,
                            subject: translate.translate("sendResetEmail.title", req.params.language),
                            html:    html,
                            text:    text
                        }, function (error) {
                            waterfallDone(error);
                        });
                    });
                });
            }
        ], function waterfallDone(error) {
            if (error) {
                return res.json({
                    success: false,
                    data: error.msg
                });
            }
            return res.json({
                success: true
            });
        });

    };
};