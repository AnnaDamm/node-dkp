/*global define, window, Roles */

"use strict";

define('views/popups/resetPassword', [
    'jquery',
    'underscore',
    'backbone',
    'text!templates/popups/resetPassword.ejs'
], function ($, _, backbone, resetPasswordPopup) {

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
        className: "dkp_modal modal_resetpassword modal fade",
        attributes: {
            "tabindex": -1
        },
        loginChecked: false,
        events: {
            "submit #resetpassword": "resetPassword"
        },
        initialize: function (options) {
            var self = this;

            this.vent = options.vent;

            this.template = _.template(resetPasswordPopup);
        },

        render: function (hash) {
            if ($(".modal_resetpassword").length === 0) {
                $(this.el).html(
                    this.template({
                        hash: hash
                    })
                );
                $("body").append(this.el);

                $("[data-toggle=popover]", this.el).popover();
            }

            $(this.el).modal('show');
        },

        resetPassword: function (e) {
            var self  = this,
                $form = $(e.target);

            if (!self.loginChecked) {
                e.preventDefault();

                if (this.validateForm()) {
                    $.ajax({
                        url: "api/user/resetPassword",
                        data: $form.serialize(),
                        beforeSend: function () {
                            $("#resetpassword")
                                .attr('disabled', 'disabled')
                                .addClass('disabled');
                        },
                        success: function (data) {
                            var errorFields;

                            if (data.success === true) {
                                self.loginChecked = true;
                                $form.trigger("submit");
                            } else {
                                if (data.data.length) {
                                    errorFields = data.data.split(",");
                                    $.each(errorFields, function (index, field) {
                                        addError($("#resetpassword" + field));
                                    });
                                }
                            }
                        },
                        error: function (data) {
                            self.vent.trigger('Alert:Error', data, self.el);
                        }
                    });
                }
            }
        },

        validateForm: function () {
            var allValid = true,
                $form = $("#resetpassword"),
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

            if ($("#resetpasswordpassword").val() !== $("#resetpasswordpassword2").val()) {
                addError($("#resetpasswordpassword"));
                addError($("#resetpasswordpassword2"));
                allValid = false;
            }

            return allValid;
        }
    });
});