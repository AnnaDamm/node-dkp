/*global define, window, Roles, RecaptchaKey */

"use strict";

define('views/popups/register', [
    'jquery',
    'underscore',
    'backbone',
    'recaptcha',
    'text!templates/popups/register.ejs'
], function ($, _, backbone, Recaptcha, registerPopup) {

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
        className: "dkp_modal modal_register modal fade",
        attributes: {
            "tabindex": -1
        },
        loginChecked: false,
        events: {
            "submit #register": "register"
        },
        initialize: function (options) {
            var self = this;

            this.vent = options.vent;

            this.template = _.template(registerPopup);
        },

        render: function () {
            if ($(".modal_register").length === 0) {
                $(this.el).html(
                    this.template({
                        roles: Roles,
                        recaptchaKey: RecaptchaKey
                    })
                );
                $("body").append(this.el);

                if (RecaptchaKey.length > 0) {
                    Recaptcha.create(RecaptchaKey, 'recaptchaDiv', {
                        theme: "blackglass"
                    });
                } else {
                    $("#recaptchaPanel").remove();
                }

                $("[data-toggle=popover]", this.el).popover();
            }

            $(this.el).modal('show');
        },

        register: function (e) {
            var self  = this,
                $form = $(e.target);

            if (!self.loginChecked) {
                e.preventDefault();

                if (this.validateForm()) {
                    $.ajax({
                        url: "api/user/register",
                        data: $form.serialize(),
                        beforeSend: function () {
                            $("#registersubmit")
                                .attr('disabled', 'disabled')
                                .addClass('disabled');
                        },
                        success: function (data) {
                            var errorFields, errorMessage;

                            if (data.success === true) {
                                self.loginChecked = true;
                                $form.trigger("submit");
                            } else {
                                if (data.data.length) {
                                    if (data.data.indexOf("message:") === 0) {
                                        errorMessage = data.data.replace("/^message:", "");
                                        self.vent.trigger("Alert:Error", errorMessage, "#recaptchaPanel");
                                    } else {
                                        $("#recaptchaPanel button").remove();
                                        errorFields = data.data.split(",");
                                        $.each(errorFields, function (index, field) {
                                            addError($("#register" + field));
                                        });
                                    }
                                }
                                Recaptcha.reload();
                            }
                        },
                        error: function (xhr) {
                            self.vent.trigger('Alert:Error', xhr.statusText, "#register");
                        }
                    });
                }
            }
        },

        validateForm: function () {
            var allValid = true,
                $form = $("#register"),
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

            if ($("#registerpassword").val() !== $("#registerpassword2").val()) {
                addError($("#registerpassword"));
                addError($("#registerpassword2"));
                allValid = false;
            }

            return allValid;
        }
    });
});