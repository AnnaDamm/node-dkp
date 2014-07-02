/*global define, window, Roles */

"use strict";

define('views/alerts', [
    'jquery',
    'underscore',
    'backbone',
    'text!templates/alerts/success.ejs',
    'text!templates/alerts/error.ejs'
], function ($, _, backbone, successMessage, errorMessage) {

    return backbone.View.extend({
        initialize: function (options) {
            var self = this;

            this.vent = options.vent;


            this.successMessage = _.template(successMessage);
            this.errorMessage   = _.template(errorMessage);
        },

        showSuccess: function (message, el) {
            this.render(message, this.successMessage, el);
        },

        showError: function (message, el) {
            this.render(message, this.errorMessage, el);
        },

        render: function (message, template, el) {
            el = el || "body";

            $(el).prepend($(this.el).html(
                template({
                    message: message
                })
            ).hide().fadeIn());

            $("[data-toggle=popover]", this.el).popover();
        }
    });
});