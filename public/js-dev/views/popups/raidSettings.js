/*global define, window, Roles */

"use strict";

define('views/popups/raidSettings', [
    'jquery',
    'underscore',
    'backbone',
    'lib/bootstrap-select',
    'collections/items',
    'collections/raidSettings',
    'text!templates/popups/raidSettings.ejs',
    'text!templates/popups/raidSettings/form.ejs'
], function ($, _, backbone, bootstrapSelect, ItemsCollection, RaidSettingsCollection, raidSettingsPopup, raidSettingsForm) {

    function addError($input) {
        $input.parents('.form-group')
            .removeClass('has-success')
            .addClass('has-error')
            .addClass('has-feedback');
    }

    return backbone.View.extend({
        className: "dkp_modal modal_raidsettings modal fade",
        attributes: {
            "tabindex": -1
        },
        loginChecked: false,
        events: {
            "change .raidSettings": "showItem",
            "submit #itemform": "updateItem",
            "click #deleteitem": "deleteItem",
            "click .raidclass .dropdown-menu a": "changeRaidClass"
        },
        initialize: function (options) {
            this.vent = options.vent;

            this.template = _.template(raidSettingsPopup);
            this.raidSettingsFormTemplate = _.template(raidSettingsForm);
        },

        render: function () {
            var self = this;

            this.settingsCollection = new RaidSettingsCollection();
            this.itemsCollection    = new ItemsCollection();

            this.reloadPopup(function (settings) {
                $("#popup").html(self.el);
                $('.dkp_modal').modal('show');

                if (settings.length > 0) {
                    $("select").selectpicker('val', settings[0]._id);
                } else {
                    $("select").trigger("change");
                }
            });
        },

        showItem: function (e) {
            var self        = this,
                settingId   = $(e.target).val(),
                setting     = this.settingsCollection.get(settingId),
                settingData = {
                    name: "",
                    "class": "important",
                    dkp: {
                        present: "",
                        killbonus: "",
                        absent: ""
                    },
                    roles: []
                };

            if (settingId !== "" && setting) {
                settingData = setting.attributes;
            }

            $("#itemdata").html(self.raidSettingsFormTemplate({
                raidSetting: settingData,
                roles: Roles,
                items: self.itemsCollection.models
            }));

            if (!settingId) {
                $("#raidname").focus();
            }

            $("#itemdata select.itemdrops").selectpicker();

            $("[data-toggle=popover]").popover();
        },

        reloadPopup: function (callback) {
            var self = this;

            self.settingsCollection.fetch(function (error, raidSettings) {
                if (error) {
                    return self.vent.trigger('Alert:Error', window.Translator.translate("raidSettings.settingsLoadFailed"), self.el);
                }
                self.itemsCollection.fetch(function (error) {
                    if (error) {
                        return self.vent.trigger('Alert:Error', window.Translator.translate("raidSettings.itemsLoadFailed"), self.el);
                    }

                    $(self.el).html(
                        self.template({
                            raidSettings: raidSettings
                        })
                    );
                    $("select", self.el).selectpicker();

                    callback(raidSettings);
                });
            });
        },

        updateItem: function (e) {
            var self  = this,
                $form = $("#itemform");

            e.preventDefault();

            $.ajax({
                url: "api/raidSettings/update",
                data: $form.serialize(),
                success: function (data) {
                    var errorFields;

                    if (data.success === true) {
                        self.reloadPopup(function () {
                            $("select").selectpicker("val", data.raidSetting._id);
                        });
                    } else {
                        if (data.data.length) {
                            errorFields = data.data.split(",");
                            $.each(errorFields, function (index, field) {
                                addError($("#raid" + field));
                            });
                        }
                    }
                }
            });
        },

        deleteItem: function (e) {
            var self = this;

            $.ajax({
                url: "api/raidSettings/delete",
                data: {
                    _id: $(e.target).data('id')
                },
                success: function (data) {
                    if (data.success === true) {
                        self.reloadPopup(function (items) {
                            if (items.length > 0) {
                                $(".raidSetting:nth-child(3)").attr('selected', 'selected');
                                $(".raidSetting").trigger('change');
                            }
                        });
                    } else {
                        self.vent.trigger('Alert:Error', window.Translator.translate("raidSettings.deleteItemFailed"), self.el);
                    }
                }
            });
        },

        changeRaidClass: function (e) {
            var self         = this,
                $clickedLink = $(e.target),
                raidClass    = $clickedLink.data('raid-class'),
                $button      = $clickedLink.parents('.btn-group').find('button');

            e.preventDefault();

            $("#raidclass").val(raidClass);
            $button.attr('class', $button.attr('class').replace(/event-[^ ]*/, "event-" + raidClass));
        }
    });
});