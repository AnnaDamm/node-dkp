/*global define, UserData */

"use strict";

define("views/menu", [
    'jquery',
    'underscore',
    'backbone',
    'text!templates/menu.ejs',
    'views/popups/roles',
    'views/popups/items',
    'views/popups/editRaid',
    'views/popups/raidSettings',
    'views/popups/users'
], function ($, _, backbone, menuTemplate,
             RolesPopupView, ItemsPopupView, RaidPopupView, RaidSettingsPopupView,
             UserPopupView
    ) {

    return backbone.View.extend({
        el: "#menu",
        events: {
            'click .btn-logout':        'logout',
            'click .btn-dkp':           'openUserOverview',
            'click .btn-settings':      'openSettingsPopup',
            'click .btn-roles':         'openRolesPopup',
            'click .btn-items':         'openItemPopup',
            'click .btn-add-raid':      'openRaidPopup',
            'click .btn-raid-settings': 'openRaidSettingsPopup',
            'click .btn-users':         'openUserPopup'
        },
        initialize: function (options) {
            this.vent = options.vent;
            this.template = _.template(menuTemplate);

            this.vent.on("Menu:ChangeDkp", function (dkp) {
                $(".user-dkp", this.el).text(dkp);
            });
        },
        render: function () {
            $(this.el).html(this.template({
                user: UserData
            }));
        },
        openUserOverview: function () {
            this.vent.trigger("Router:Navigate", "members");
        },
        openSettingsPopup: function () {
            this.vent.trigger("Router:Navigate", "settings");
        },
        openRolesPopup: function () {
            var rolesPopupView = new RolesPopupView({vent: this.vent});
            rolesPopupView.render();
        },
        openItemPopup: function () {
            var itemsPopupView = new ItemsPopupView({vent: this.vent});
            itemsPopupView.render();
        },
        openRaidPopup: function () {
            var raidPopupView = new RaidPopupView({vent: this.vent});
            raidPopupView.render();
        },
        openRaidSettingsPopup: function () {
            var raidSettingsPopupView = new RaidSettingsPopupView({vent: this.vent});
            raidSettingsPopupView.render();
        },
        openUserPopup: function () {
            var userPopupView = new UserPopupView({vent: this.vent});
            userPopupView.render();
        },
        logout: function (e) {
            var self = this;
            $.ajax({
                url: "api/user/logout",
                success: function (data) {
                    return self.vent.trigger("Router:Reload");
                }
            });
        }
    });
});