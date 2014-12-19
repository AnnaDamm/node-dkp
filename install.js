#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

"use strict";

var sys          = require("sys"),
    async        = require("async"),
    mongojs      = require("mongojs"),
    uuid         = require("node-uuid"),
    read         = require("read"),
    crypto       = require("crypto"),
    fs           = require("fs"),
    stdin        = process.openStdin(),
    randomstring = require("randomstring"),

    defaultSettings = require("./lib/defaultSettings.json"),
    defaultConfig   = require("./config.default.json"),
    packageJson     = require("./package.json"),

    // init variables that rely on a config file
    config,
    mongo,
    database;

async.waterfall([

    function checkIfConfigFileExists(waterfallDone) {
        fs.stat("config.json", function (error) {
            if (error) {
                if (error.errno === 34) {
                    return waterfallDone(null, false);
                }
                return waterfallDone(error)
            }
            waterfallDone(null, true);
        });
    },
    function writeNewConfigFile(isConfigExisting, waterfallDone) {
        if (isConfigExisting) {
            return waterfallDone();
        }
        console.log("Creating new config file, please enter some data.");

        defaultConfig.cookie.secret  = randomstring.generate(128);
        defaultConfig.session.secret = randomstring.generate(128);

        async.waterfall([
            function inputPort(configDone) {
                read({prompt: "Port to use", default: defaultConfig.port}, configDone);
            },
            function inputMongoUrl(port, isDefault, configDone) {
                defaultConfig.port = parseInt(port, 10);
                console.log(" ");
                console.log("MongoDB data");
                console.log("------------------");
                read({prompt: "MongoDB url", default: defaultConfig.mongo.url}, configDone);
            },
            function isRedisSocket(mongoUrl, isDefault, configDone) {
                var useRedisSocket;
                defaultConfig.mongo.url = mongoUrl;

                console.log(" ");
                console.log("Redis data");
                console.log("------------------");
                async.doUntil(function readCorrectInput(untilDone) {
                    read({prompt: "Use Redis via socket? ", default: "no"}, function (error, input, isDefault) {
                        if (error) {
                            return untilDone(error);
                        }
                        useRedisSocket = input;
                        untilDone();
                    });
                }, function test() {
                    if (["yes", "no", "y", "n", "1", "0"].indexOf(useRedisSocket) >= 0) {
                        return true;
                    }
                    return false;
                }, function (error) {
                    return configDone(error, useRedisSocket);
                });
            },
            function getRedisInput(useRedisSocket, configDone) {
                if (["yes", "y", "1"].indexOf(useRedisSocket) >= 0) {
                    defaultConfig.redis = {
                        host: "127.0.0.1",
                        socket: "~/.redis/sock",
                        database: 0
                    };
                    async.waterfall([
                        function inputRedisHost(redisDone) {
                            read({prompt: "Host", default: defaultConfig.redis.host}, redisDone);
                        },
                        function inputRedisPort(host, isDefault, redisDone) {
                            defaultConfig.redis.host = host;
                            read({prompt: "Socket path", default: defaultConfig.redis.socket}, redisDone);
                        },
                        function inputRedisDatabase(port, isDefault, redisDone) {
                            defaultConfig.redis.port = port;
                            read({prompt: "Database", default: defaultConfig.redis.database}, redisDone);
                        },
                        function getRedisDatabase(database, isDefault, redisDone) {
                            defaultConfig.redis.db = parseInt(database, 10);
                            redisDone();
                        }
                    ], function redisDone(error) {
                        configDone(error);
                    });
                } else {
                    async.waterfall([
                        function inputRedisHost(redisDone) {
                            read({prompt: "Host", default: defaultConfig.redis.host}, redisDone);
                        },
                        function inputRedisPort(host, isDefault, redisDone) {
                            defaultConfig.redis.host = host;
                            read({prompt: "Port", default: defaultConfig.redis.port}, redisDone);
                        },
                        function inputRedisDatabase(port, isDefault, redisDone) {
                            defaultConfig.redis.port = port;
                            read({prompt: "Database", default: defaultConfig.redis.db.toString()}, redisDone);
                        },
                        function inputRedisPort(database, isDefault, redisDone) {
                            defaultConfig.redis.db = parseInt(database, 10);
                            read({prompt: "Password", default: ""}, redisDone);
                        },
                        function getRedisPass(pass, isDefault, redisDone) {
                            defaultConfig.redis.pass = pass.length ? pass : null;
                            redisDone();
                        }
                    ], function redisDone(error) {
                        configDone(error);
                    });
                }
            },
            function writeConfigFile(configDone) {
                var configJson = JSON.stringify(defaultConfig, null, 4);
                fs.writeFile("config.json", configJson, function (error) {
                    configDone(error);
                });
            }
        ], function configDone(error) {
            waterfallDone(error);
        });
    },

    function requireModules(waterfallDone) {
        config   = require("./config.json");
        mongo    = mongojs(config.mongo.url);
        database = require("./lib/database")(mongo);

        waterfallDone();
    },
    function initDatabase(waterfallDone) {
        console.log(" ");
        console.log("------------------");
        console.log("Initializing database...");
        database.createIndexes(waterfallDone);
    },
    function createDefaultSettings(waterfallDone) {
        console.log(" ");
        console.log("------------------");
        console.log("Insert default settings...");
        var settingsCollection = mongo.collection("settings");
        async.each(Object.getOwnPropertyNames(defaultSettings), function (key, eachDone) {
            settingsCollection.update({
                key: key
            }, {
                $setOnInsert: {
                    key: key,
                    value: defaultSettings[key]
                }
            }, {
                upsert: true
            }, function (error) {
                eachDone(error);
            });
        }, function eachDone(error) {
            waterfallDone(error);
        });
    },
    function updateVersion(waterfallDone) {
        mongo.collection("settings").update({
            key: "version"
        }, {
            key: "version",
            value: packageJson.version
        }, {
            upsert: true
        }, function (error) {
            waterfallDone(error);
        });
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

        console.log(" ");
        console.log("Admin data");
        console.log("------------------");
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
        console.log(error);
        process.exit(1);
    }
    console.log(" ");
    console.log("------------------");
    console.log("Finished installation.");
    process.exit();
});