/*global define, window */

"use strict";

define('views/popups/raid/signedOffTab', [
    'jquery',
    'underscore',
    'backbone',
    'text!templates/popups/raid/signedOffTab.ejs'
], function ($, _, backbone, template) {

    var roleId = "000000000000000000000000";

    return backbone.View.extend({
        events: {
            'click .member': 'memberLinkClicked',
            'click .signOff': 'signOffClicked'
        },
        initialize: function (options) {
            this.vent = options.vent;

            this.template = _.template(template);
        },

        render: function (raid) {
            var self       = this,
                signedOff  = {};

            self.raid  = raid || self.raid;

            _.each(self.raid.attributes.signedOff, function (users, roleId) {
                _.each(users, function (user, userId) {
                    if (!raid.isAffirmed(userId)) {
                        if (!signedOff[roleId]) {
                            signedOff[roleId] = {};
                        }
                        signedOff[roleId][userId] = user;
                    }
                });
            });

            $(self.el).html(self.template({
                signedOff: signedOff
            }));
        },

        memberLinkClicked: function () {
            var $el = $(".modal_raid");
            $el.off('hidden.bs.modal')
                .on('hidden.bs.modal', function () {
                    $(this).off('hidden.bs.modal');
                    $el.remove();
                })
                .modal('hide');
        },

        signOffClicked: function () {
            var self = this;
            $.ajax({
                url: "api/raids/changeUser",
                data: {
                    type: "removeSignUp",
                    raidId: self.raid.id,
                    roleId: roleId
                },
                success: function (data) {
                    if (data.success) {
                        self.vent.trigger("Router:Reload");
                    } else {
                        self.vent.trigger("Alert:Error", data.data, '.dkp_modal');
                    }
                },
                error: function () {
                    self.vent.trigger("Alert:Error", window.Translator.translate("errors.connection"), '.dkp_modal');
                }
            });
        }
    });
});