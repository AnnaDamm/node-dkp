#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

"use strict";

var sys      = require("sys"),
    async    = require("async"),
    mongojs  = require("mongojs"),
    uuid     = require("node-uuid"),
    read     = require("read"),
    crypto   = require("crypto"),

    config   = require("./config"),
    database = require("./database")(),

    mongo    = mongojs(config.mongo.url, [
        "users", "raids", "raidSettings", "items"
    ]),


    stdin    = process.openStdin();

async.waterfall([
    function initDatabase(waterfallDone) {
        console.log("Initializing database...");
        database.init(mongo, waterfallDone);
    },
    function checkIfAdminAccountExists(waterfallDone) {
        mongo.collection("users").findOne({isAdmin: true}, function (error, user) {
             if (error) {
                 return waterfallDone(error);
             }
            return waterfallDone(null, user);
        });
    },
    function createAdminAccount(user, waterfallDone) {
        if (user) {
            return waterfallDone();
        }

        console.log("Creating admin user account, please enter user data.");

        var userName, charName, userEmail;

        async.waterfall([
            function inputUserName(adminAccDone) {
                read({prompt: "Login Name: "}, adminAccDone);
            },
            function inputCharacterName(name, isDefault, adminAccDone) {
                userName = name;
                read({prompt: "Character Name: "}, adminAccDone);
            },
            function inputEmail(name, isDefault, adminAccDone) {
                charName = name;
                read({prompt: "Email: "}, adminAccDone);
            },
            function inputPassword(email, isDefault, adminAccDone) {
                userEmail = email;
                read({prompt: "Enter Password: ", silent: true, replace: "*"}, adminAccDone);
            },
            function insertUserIntoDatabase(pw, isDefault, adminAccDone) {
                var salt = uuid.v4().replace(/-/g, ""),
                    user = {
                        login: userName,
                        smallLogin: userName.toLowerCase(),
                        salt: salt,
                        password: "",
                        email: userEmail.toLowerCase(),
                        characters: [{
                            name: charName,
                            smallName: charName.toLowerCase
                        }],
                        isAdmin: true,
                        dkp: 0
                    },
                    hash = crypto.createHash('sha512');

                hash.update(JSON.stringify(salt + ":" + pw));

                user.password = hash.digest('hex');

                mongo.collection("users").insert(user, function (error, user) {
                    adminAccDone(error, user);
                });
            }
        ], function adminAccDone(error) {
            if (!error) {
                console.log("Account created.");
            }
            waterfallDone(error);
        });
    }
], function waterfallDone(error) {
    if (error) {
        console.log(error.msg);
        process.exit(1);
    }
    console.log("Finished.");
    process.exit();
});