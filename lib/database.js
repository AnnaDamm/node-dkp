"use strict";

var async = require("async");

module.exports = function (mongo) {
    return {
        createIndexes: function (callback) {
            var userCollection        = mongo.collection('users'),
                itemCollection        = mongo.collection('items'),
                raidSettingCollection = mongo.collection('raidSettings'),
                raidCollection        = mongo.collection("raids"),
                roleCollection        = mongo.collection("roles"),
                dkpCollection         = mongo.collection("dkp"),
                commentsCollection    = mongo.collection("comments"),
                settingsCollection    = mongo.collection("settings");

            async.parallel([
                function (parallelDone) {
                    userCollection.ensureIndex({ login: 1 }, {unique: true}, parallelDone);
                },
                function (parallelDone) {
                    userCollection.ensureIndex({ smallLogin: 1 }, {unique: true}, parallelDone);
                },
                function (parallelDone) {
                    userCollection.ensureIndex({ email: 1 }, {unique: true}, parallelDone);
                },
                function (parallelDone) {
                    userCollection.ensureIndex({ "characters.name": 1 }, {unique: true}, parallelDone);
                },
                function (parallelDone) {
                    userCollection.ensureIndex({ "characters.smallName": 1 }, {unique: true}, parallelDone);
                },
                function (parallelDone) {
                    userCollection.ensureIndex({ "passwordReset.hash": 1, "passwordReset.timeout": 1}, {}, parallelDone);
                },
                function (parallelDone) {
                    itemCollection.ensureIndex({ name: 1}, {unique: true}, parallelDone);
                },
                function (parallelDone) {
                    raidSettingCollection.ensureIndex({name: 1}, {unique: true}, parallelDone);
                },
                function (parallelDone) {
                    raidCollection.ensureIndex({date: 1}, parallelDone);
                },
                function (parallelDone) {
                    raidCollection.ensureIndex({type: 1}, parallelDone);
                },
                function (parallelDone) {
                    raidCollection.ensureIndex({isDefault: 1}, {sparse: true}, parallelDone);
                },
                function (parallelDone) {
                    roleCollection.ensureIndex({ rank: 1}, parallelDone);
                },
                function (parallelDone) {
                    dkpCollection.ensureIndex({"raid.id": 1, isRaidDkp: 1}, parallelDone);
                },
                function (parallelDone) {
                    dkpCollection.ensureIndex({date: 1}, parallelDone);
                },
                function (parallelDone) {
                    commentsCollection.ensureIndex({"raid.id": 1}, parallelDone);
                },
                function (parallelDone) {
                    commentsCollection.ensureIndex({"date": 1}, parallelDone);
                },
                function (parallelDone) {
                    commentsCollection.ensureIndex({"user.id": 1}, parallelDone);
                },
                function (parallelDone) {
                    settingsCollection.ensureIndex({"key": 1}, {unique: true}, parallelDone);
                }
            ], function parallelDone() {
                if (typeof callback === "function") {
                    callback();
                }
            });
        }
    };
};