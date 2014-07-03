"use strict";

var async    = require("async"),

    routes = {
        'get /':                            'default',
        'post /login':                      'login',

        'post /api/roles':                  'api/roles',

        'post /api/comments/add':           'api/comments/add',
        'post /api/comments/get':           'api/comments/get',

        'post /api/dkp/getUserHistory':     'api/dkp/getUserHistory',
        'post /api/dkp/giveItem':           'api/dkp/giveItem',
        'post /api/dkp/removeItem':         'api/dkp/removeItem',
        'post /api/dkp/setInRaid':          'api/dkp/setInRaid',

        'post /api/items/delete':           'api/items/delete',
        'post /api/items/get':              'api/items/get',
        'post /api/items/update':           'api/items/update',

        'post /api/raids/changeUser':       'api/raids/changeUser',
        'post /api/raids/delete':           'api/raids/delete',
        'post /api/raids/get':              'api/raids/get',
        'post /api/raids/getInTime':        'api/raids/getInTime',
        'post /api/raids/update':           'api/raids/update',

        'post /api/raidSettings/delete':    'api/raidSettings/delete',
        'post /api/raidSettings/get':       'api/raidSettings/get',
        'post /api/raidSettings/update':    'api/raidSettings/update',

        'post /api/roles/update':           'api/roles/update',

        'post /api/user/changeEmail':       'api/user/changeEmail',
        'post /api/user/changePassword':    'api/user/changePassword',
        'post /api/user/change':            'api/user/change',
        'post /api/user/getAll':            'api/user/getAll',
        'post /api/user/getDkp':            'api/user/getDkp',
        'post /api/user/login':             'api/user/login',
        'post /api/user/logout':            'api/user/logout',
        'post /api/user/register':          'api/user/register',
        'post /api/user/resetPassword':     'api/user/resetPassword',
        'post /api/user/sendResetEmail':    'api/user/sendResetEmail'
    };

module.exports = function () {
    return {
        init: function init(app, mongo, config, settings, translation) {

            app.get("/", function (req, res) {
                res.redirect(req.hostUrl + "/" + translation.getDefaultLanguage(req));
            });

            async.each(Object.getOwnPropertyNames(routes), function (route, eachDone) {
                try {
                    var splitted = route.split(" "),
                        routeFunction = require('./' + routes[route])(mongo, config, settings, translation),
                        method = splitted[0];

                    app[method]("/:language" + splitted[1], function (req, res) {
                        if (!translation.hasLanguage(req.params.language)) {
                            req.params.language = translation.getDefaultLanguage(req);
                        }
                        routeFunction(req, res);
                    });
                } catch (e) {
                    console.log(e);
                }
                eachDone();
            }, function eachDone() {
                console.log("Routes loaded.");
            });
        }
    };
};