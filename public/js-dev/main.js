/*global window, requirejs, require, GlobalLanguage, GlobalTheme, SessionKey, SessionUser, CSRFToken, Translations, Languages*/

requirejs.config({
    shim: {
        'underscore': {
            exports: '_'
        },
        'jquery': {
            exports: '$'
        },
        'jqueryui': {
            deps: ['jquery']
        },
        'backbone': {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        },
        'bootstrap': {
            deps: ['jquery']
        },
        'recaptcha': {
            exports: "Recaptcha"
        }
    },
    // do not create a global objects
    paths: {
        'text': 'lib/text',
        'json2': 'lib/json2',
        'jquery': 'lib/jquery',
        'jqueryui': 'lib/jquery-ui.custom',
        'underscore': 'lib/underscore',
        'backbone': 'lib/backbone',
        'bootstrap': 'lib/bootstrap',
        'moment': 'lib/moment',
        'recaptcha': '//www.google.com/recaptcha/api/js/recaptcha_ajax'
    }
});

require(['app'], function (app) {
    'use strict';

    app.initialize();
});