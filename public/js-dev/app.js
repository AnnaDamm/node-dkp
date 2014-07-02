/*global define, CSRFToken*/

"use strict";

define('app', [
    'jquery',
    'underscore',
    'backbone',
    'bootstrap',
    'helpers/translator',
    'controllers/main',
    'controllers/view'
], function ($, _, backbone, bootstrap, translator, MainController, ViewController) {
    return {
        initialize: function () {
            $.ajaxPrefilter(function (options, originalOptions, jqXHR) {
                if (!options.url.match(/\/?api\//)) {
                    return;
                }
                options.type = "POST";
                options.dataType = "json";
                options.beforeSend = function (request) {
                    request.setRequestHeader("X-CSRF-Token", CSRFToken);
                };
            });

            var eventHandler   = _.extend({}, backbone.Events),
                mainController = new MainController({ vent: eventHandler }),
                viewController = new ViewController({ vent: eventHandler });

            window.Translator = translator;

            backbone.history.start();
        }
    };
});