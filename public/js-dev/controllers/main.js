/*global define, UserData, window */

"use strict";

define('controllers/main', [
    'jquery',
    'underscore',
    'backbone',
    'views/popups/userOverview',
    'views/popups/raid',
    'views/popups/resetPassword',
    'views/popups/settings'
], function ($, _, backbone, UserOveriewView, RaidView, ResetPasswordView, SettingsView) {
    return backbone.Router.extend({
        routes: {
            "": "home",
            "calendar(/:type/:date)": "calendar",
            "members(/:userId)": "members",
            "settings": "settings",
            "raid/:id(/:tab)": "raid",
            "resetPassword/:hash": "resetPassword",
            "*actions": "home"
        },
        calendarRendered: false,

        initialize: function (options) {
            var self = this,
                history = [];

            function reloadDkp() {
                $.ajax({
                    url: "api/user/getDkp",
                    success: function (data) {
                        if (data.success) {
                            UserData.dkp = data.dkp;
                            self.vent.trigger("Menu:ChangeDkp", data.dkp);
                        }
                    }
                });
            }

            this.vent = options.vent;
            this.vent.on('Router:DoNavigate', function (route, options) {
                self.navigate(route, options);
            });

            this.vent.on('Router:Navigate', function (route) {
                self.vent.trigger('Router:DoNavigate', route, {
                    trigger: true,
                    pushState: true
                });
            });

            this.vent.on('Router:ChangeUrl', function (route, pushHistory) {
                self.vent.trigger('Router:DoNavigate', route, {
                    trigger: false,
                    pushState: true,
                    replace: true
                });
                if (backbone.history.fragment.indexOf("calendar") === 0 && pushHistory && (history.length === 0 || backbone.history.fragment !== history[history.length - 1])) {
                    history.push(backbone.history.fragment);
                }
            });

            this.vent.on('Router:Back', function () {
                if (history.length > 0) {
                    self.vent.trigger('Router:Navigate', history[history.length - 1]);
                } else {
                    self.vent.trigger('Router:Navigate', '');
                }
            });

            this.vent.on("Router:Reload", function () {
                return window.location.reload();
            });

            this.listenTo(this, 'route', function () {
                if (backbone.history.fragment.indexOf("calendar") === 0 && (history.length === 0 || backbone.history.fragment !== history[history.length - 1])) {
                    history.push(backbone.history.fragment);
                }
            });

            this.vent.on("User:ReloadDkp", function () {
                if (UserData) {
                    reloadDkp();
                }
            });

            if (UserData) {
                setInterval(reloadDkp, 300000);
            }
        },
        checkUserData: function () {
            if (!UserData) {
                this.vent.trigger("Router:Navigate", "");
                return false;
            }
            return true;
        },
        home: function () {
            if (UserData) {
                this.vent.trigger("Router:Navigate", "calendar");
            }
        },
        calendar: function (type, date) {
            if (!this.checkUserData()) {
                return;
            }
            this.vent.trigger('View:Calendar:Render', type, date);

            this.calendarRendered = true;
        },
        members: function (userId) {
            var userOveriewView;
            if (!this.checkUserData()) {
                return;
            }

            if (!this.calendarRendered) {
                this.calendar();
            }

            userOveriewView = new UserOveriewView({vent: this.vent});
            userOveriewView.render(userId);
        },
        settings: function () {
            var settingsView;
            if (!this.checkUserData()) {
                return;
            }

            if (!this.calendarRendered) {
                this.calendar();
            }

            settingsView = new SettingsView({vent: this.vent});
            settingsView.render();
        },
        raid: function (id, tab) {
            var raidView;
            if (!this.checkUserData()) {
                return;
            }

            if (!this.calendarRendered) {
                this.calendar();
            }

            raidView = new RaidView({vent: this.vent});
            raidView.render(id, tab);
        },
        resetPassword: function (hash) {
            var resetPasswordView;
            if (UserData) {
                return this.vent.trigger("Alert:Error", "Du kannst dein Passwort nicht zurücksetzen während du angemeldet bist");
            }
            resetPasswordView = new ResetPasswordView({vent: this.vent});
            resetPasswordView.render(hash);
        }
    });
});