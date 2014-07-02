/*global define, window, Roles:true, confirm, UserData */

"use strict";

define('views/popups/settings', [
    'jquery',
    'underscore',
    'backbone',
    'text!templates/popups/settings.ejs'
], function ($, _, backbone, settingsPopup) {

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
        className: "dkp_modal modal_settings modal fade",
        attributes: {
            "tabindex": -1
        },
        events: {
            "submit #emailform": "saveEmail",
            "submit #passwordform": "savePassword"
        },
        initialize: function (options) {
            this.vent = options.vent;

            this.template   = _.template(settingsPopup);
        },

        render: function (isReload) {
            var self = this,
                $el  = $(self.el);

            isReload = isReload || false;

            $el.html(self.template({
                currentEmail: UserData.email
            }));

            $el.find('[data-trigger="popover"]').popover();

            if (!isReload) {
                $("#body").append(self.el);
                $el.modal('show');

                $el.on('hidden.bs.modal', function (e) {
                    $(this).off('hidden.bs.modal');
                    $el.remove();
                    self.vent.trigger("Router:Back");
                }).modal('show');
            }
        },

        saveEmail: function (e) {
            var self = this,
                $form = $("#emailform");

            e.preventDefault();

            if (self.validateForm($form)) {
                $.ajax({
                    url: "api/user/changeEmail",
                    data: $form.serialize(),
                    success: function (data) {
                        var errorFields;
                        if (data.success) {
                            self.render(true);
                            self.vent.trigger("Alert:Success", window.Translator.translate("setting.emailChanged"), self.el);
                        } else {
                            if (data.data.length) {
                                errorFields = data.data.split(",");
                                $.each(errorFields, function (index, field) {
                                    addError($("#email" + field));
                                });
                            }
                        }
                    },
                    error: function () {
                        self.vent.trigger("Alert:Error", window.Translator.translate("setting.emailChangeFailed"), self.el);
                    }
                });
            }
        },

        savePassword: function (e) {
            var self = this,
                $form = $("#passwordform");

            e.preventDefault();

            if (self.validateForm($form)) {
                $.ajax({
                    url: "api/user/changePassword",
                    data: $form.serialize(),
                    success: function (data) {
                        var errorFields;
                        if (data.success) {
                            self.render(true);
                            self.vent.trigger("Alert:Success", window.Translator.translate("setting.passwordChanged"), self.el);
                        } else {
                            if (data.data.length) {
                                errorFields = data.data.split(",");
                                $.each(errorFields, function (index, field) {
                                    addError($("#password" + field));
                                });
                            }
                        }
                    },
                    error: function () {
                        self.vent.trigger("Alert:Error", window.Translator.translate("setting.passwordChangeFailed"), self.el);
                    }
                });
            }
        },

        validateForm: function (form) {
            var allValid = true,
                $form = $(form),
                $requiredInputs = $form.find("input.required, select.required");

            $.each($requiredInputs, function (index, input) {
                var thisValid = true,
                    $input  = $(input),
                    pattern = $input.data('pattern'),
                    sameas  = $input.data('sameas');


                if (!$input.val() || $input.val().trim().length === 0) {
                    thisValid = false;
                }
                if (pattern && pattern.length > 0 && !$input.val().match(new RegExp(pattern))) {
                    thisValid = false;
                }

                if (sameas && sameas.length > 0 && $input.val() !== $(sameas).val()) {
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