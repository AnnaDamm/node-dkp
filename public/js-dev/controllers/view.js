/*global define */

"use strict";

define('controllers/view', [
    'jquery',
    'underscore',
    'backbone',
    'views/calendar',
    'views/index',
    'views/popups/register',
    'views/popups/sendPasswordReset',
    'views/alerts'
], function ($, _, backbone, CalendarView, IndexView,
             RegisterPopupView, SendResetMailPopupView,
             AlertsView
    ) {
    return function (options) {
        var vent = options.vent,


            calendarView      = new CalendarView({vent: vent}),
            indexView         = new IndexView({vent: vent}),
            registerPopupView = new RegisterPopupView({vent: vent}),
            sendResetMailPopupView = new SendResetMailPopupView({vent: vent}),
            alertsView        = new AlertsView({vent: vent});


        vent.on('View:RegisterPopup:Render', function () {
            registerPopupView.render();
        });

        vent.on('View:Calendar:Render', function (type, date) {
            calendarView.render(type, date);
        });

        vent.on('View:SendResetMailPopup:Render', function () {
            sendResetMailPopupView.render();
        });

        vent.on('Alert:Success', function (message, element) {
            alertsView.showSuccess(message, element);
        });

        vent.on('Alert:Error', function (message, element) {
            alertsView.showError(message, element);
        });
    };
});