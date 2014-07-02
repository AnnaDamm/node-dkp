/*global define, window */

"use strict";

define('views/index', [
    'jquery',
    'underscore',
    'backbone'
], function ($, _, backbone) {
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
        loginChecked: false,
        el: "#page-content",
        events: {
            'click #registerbutton': 'openRegisterPopup',
            'click #resetpasswordbutton': 'openSendResetMailPopup',
            'submit #login': 'login'
        },
        initialize: function (options) {
            this.vent = options.vent;
        },


        openRegisterPopup: function (e) {
            this.vent.trigger("View:RegisterPopup:Render");
        },

        openSendResetMailPopup: function (e) {
            this.vent.trigger("View:SendResetMailPopup:Render");
        },

        validateForm: function () {
            var allValid = true,
                $form = $("#login"),
                $requiredInputs = $form.find("input.required");

            $.each($requiredInputs, function (index, input) {
                var thisValid = true,
                    $input  = $(input);

                if (!$input.val() || $input.val().trim().length === 0) {
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
        },

        login: function (e) {
            var self = this;

            if (!self.loginChecked) {
                e.preventDefault();
                if (this.validateForm()) {
                    $.ajax({
                        url: "api/user/login",
                        data: $(e.target).serialize(),
                        success: function (data) {
                            var userModel;

                            if (!data.success) {
                                addError($("#loginname"));
                                addError($("#loginpassword"));
                            } else {
                                self.loginChecked = true;
                                $("#login").submit();
                            }
                        }
                    });
                }
            }


        }
    });
});