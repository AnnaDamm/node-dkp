/*global define, window, Roles */

"use strict";

define('views/popups/editRaid', [
    'jquery',
    'underscore',
    'backbone',
    'lib/bootstrap-datetimepicker',
    'lib/bootstrap-select',
    'lib/language/moment/de',
    'collections/raidSettings',
    'text!templates/popups/editRaid.ejs',
    'text!templates/popups/editRaid/settingsForm.ejs'
], function ($, _, backbone, DateTimePicker, bootstrapSelect, Moment, RaidSettingsCollection, raidPopup, raidSettingsForm) {

    function addError($input) {
        $input.parents('.form-group')
            .removeClass('has-success')
            .addClass('has-error')
            .addClass('has-feedback');
    }

    return backbone.View.extend({
        className: "dkp_modal modal_raid modal fade",
        attributes: {
            "tabindex": -1
        },
        loginChecked: false,
        events: {
            "submit #raidform": "updateRaid",
            "change #raidtype": "raidTypeChanged",
            "change #raiddate": "raidDateChanged",
            "change #raidenddate": "raidDateChanged",
            "click .raidclass .dropdown-menu a": "changeRaidClass",
            "click #deleteraid": "deleteRaid"
        },
        initialize: function (options) {
            this.vent = options.vent;

            this.template = _.template(raidPopup);
            this.settingsForm = _.template(raidSettingsForm);

            var date    = new Date(),
                endDate = new Date();

            date.setHours(20);
            date.setMinutes(0);
            date.setSeconds(0);

            endDate.setHours(22);
            endDate.setMinutes(0);
            endDate.setSeconds(0);


            this.raid = {
                _id: "",
                name: "",
                date: date.toISOString(),
                "class": "important",
                endDate: endDate.toISOString(),
                dkp: {
                    present: "",
                    killbonus: "",
                    absent: ""
                },
                roles: [],
                items: []
            };
        },

        render: function (raid) {
            var self = this;

            this.raidSettingsCollection = new RaidSettingsCollection();
            this.raid = raid || this.raid;

            this.raid.dateObject = new Date(this.raid.date);
            this.raid.endDateObject = new Date(this.raid.endDate);

            this.reloadPopup(function () {
                $("#popup").html(self.el);
                $('.dkp_modal').modal('show');
                $("select").selectpicker();

                var options = {
                        language: window.Translator.translate("language.short"),
                        useSeconds: false,
                        minuteStepping: 30,
                        minDate: new Date("2014-01-01 00:00:00"),
                        defaultDate: self.raid.date
                    },
                    $raidDate = $("#raiddate"),
                    $raidEndDate = $("#raidenddate");


                $raidDate.datetimepicker(options);
                options.defaultDate = self.raid.endDate;

                $raidEndDate.datetimepicker(options);

                function raidDateChange(e) {
                    if ($raidEndDate.val() === "") {
                        $raidEndDate.data("DateTimePicker").setDate(e.date.add('h', 2));
                    } else {
                        $raidEndDate.data("DateTimePicker").setDate(
                            $raidEndDate.data("DateTimePicker").getDate().add('ms', e.date.diff(e.oldDate))
                        );
                    }
                    $raidEndDate.trigger("change");
                }

                $raidDate.on("dp.change", raidDateChange);

                $('.dkp_modal').on('hide.bs.modal', function () {
                    $(".bootstrap-datetimepicker-widget").remove();
                });

                if (self.raid._id === "") {
                    $('#raidtype').trigger("change");
                } else {
                    $("#settings").html(self.settingsForm({
                        raid:  self.raid,
                        roles: Roles
                    }));
                }
                $("#settings").find("[data-toggle='popover']").popover();
            });
        },

        raidTypeChanged: function (e) {
            var raidSettings = this.raidSettingsCollection.get($(e.target).val());
            if (!raidSettings) {
                raidSettings = this.raid;
            } else {
                raidSettings = raidSettings.attributes;
            }
            $("#settings").html(this.settingsForm({
                raid: raidSettings,
                roles: Roles
            }));
        },

        raidDateChanged: function (e) {
            var $target = $(e.target);
            $("#" + $target.data('hidden-field')).val($target.data("DateTimePicker").getDate().format("X"));
        },

        reloadPopup: function (callback) {
            var self = this;

            self.raidSettingsCollection.fetch(function (error, raidSettings) {
                if (error) {
                    return self.vent.trigger('Alert:Error', window.Translator.translate("editRaid.loadFailed"));
                }
                $(self.el).html(
                    self.template({
                        raidSettings: raidSettings,
                        raid: self.raid
                    })
                );

                callback(raidSettings);
            });
        },

        updateRaid: function (e) {
            var self = this;
            e.preventDefault();

            $.ajax({
                url: "api/raids/update",
                data: $("#raidform").serialize(),
                success: function (data) {
                    var errorFields;
                    if (data.success) {
                        return self.vent.trigger("Router:Reload");
                    }

                    self.vent.trigger("Alert:Error", data.data, ".dkp_modal");
                    if (data.data && data.data.length) {
                        errorFields = data.data.split(",");
                        $.each(errorFields, function (index, field) {
                            addError($("#item" + field));
                        });
                    }
                }
            });
        },

        changeRaidClass: function (e) {
            var $clickedLink = $(e.target),
                raidClass    = $clickedLink.data('raid-class'),
                $button      = $clickedLink.parents('.btn-group').find('button');

            e.preventDefault();

            $("#raidclass").val(raidClass);
            $button.attr('class', $button.attr('class').replace(/event-[^ ]*/, "event-" + raidClass));
        },

        deleteRaid: function (e) {
            var self = this;

            $.ajax({
                url: "api/raids/delete",
                data: {
                    _id: $(e.target).data('id')
                },
                success: function (data) {
                    if (data.success === true) {
                        self.vent.trigger("Router:Reload");
                        return;
                    }
                    self.vent.trigger('Alert:Error', window.Translator.translate("editRaid.deleteFailed"));
                }
            });
        }
    });
});