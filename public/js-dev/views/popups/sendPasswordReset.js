/*global define, window, Roles */

"use strict";

define('views/popups/sendPasswordReset', [
    'jquery',
    'underscore',
    'backbone',
    'text!templates/popups/sendPasswordReset.ejs'
], function ($, _, backbone, sendPasswordResetPopup) {

    function addError($input) {
        $input.parents('.form-group')
            .removeClass('has-success')
            .addClass('has-error')
            .addClass('has-feedback');
    }

    function addSuccess($input) {
        $input.parents('.form-group')
            .removeClass('has-error')
            .addClass('has-success')
            .addClass('has-feedback');
    }

    return backbone.View.extend({
        className: "dkp_modal modal_sendresetmail modal fade",
        attributes: {
            "tabindex": -1
        },
        events: {
            "submit #sendresetmail": "sendPasswordReset"
        },
        initialize: function (options) {
            var self = this;

            this.vent = options.vent;

            this.template = _.template(sendPasswordResetPopup);
        },

        render: function () {
            if ($(".modal_sendresetmail").length === 0) {
                $(this.el).html(
                    this.template()
                );
                $("body").append(this.el);

                $("[data-toggle=popover]", this.el).popover();
            }

            $(this.el).modal('show');

        },

        sendPasswordReset: function (e) {
            var self  = this,
                $form = $(e.target);

            e.preventDefault();

            if (this.validateForm()) {
                $.ajax({
                    url: "api/user/sendResetEmail",
                    data: $form.serialize(),
                    beforeSend: function () {
                        $("#sendresetmailbutton")
                            .attr('disabled', 'disabled')
                            .addClass('disabled');
                    },
                    success: function (data) {
                        var errorFields;

                        if (data.success === true) {
                            $(self.el).modal('hide');
                            self.vent.trigger("Alert:Success", window.Translator.translate("sendPasswordReset.mailSent"));
                        } else {
                            if (data.data.length) {
                                errorFields = data.data.split(",");
                                $.each(errorFields, function (index, field) {
                                    addError($("#sendresetmail" + field));
                                });
                            }
                        }
                    },
                    error: function (data) {
                        self.vent.trigger('Alert:Error', data, self.el);
                    }
                });
            }
        },

        validateForm: function () {
            var allValid = true,
                $form = $("#sendresetmail"),
                $requiredInputs = $form.find("input.required, select.required");

            $.each($requiredInputs, function (index, input) {
                var thisValid = true,
                    $input  = $(input),
                    pattern = $input.data('pattern');


                if (!$input.val() || $input.val().trim().length === 0) {
                    thisValid = false;
                }
                if (pattern && pattern.length > 0 && !$input.val().match(new RegExp(pattern))) {
                    thisValid = false;
                }


                if (thisValid) {
                    addSuccess($input);
                } else {
                    addError($input);
                    allValid = false;
                }
            });

            return allValid;
        }
    });
});