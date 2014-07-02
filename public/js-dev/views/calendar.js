/*global define, window, document */

"use strict";

define('views/calendar', [
    'jquery',
    'underscore',
    'backbone',
    'lib/calendar',
    'text!templates/calendar.ejs',
    'lib/language/calendar/de-DE',
    'views/menu',
    'text!templates/calendar/raidListItem.ejs',
    'lib/language/moment/de',
    'text!templates/loading.ejs'
], function ($, _, backbone, calendarLib, calendarTemplate, language, MenuView, raidListItemTemplate, moment,
    loadingTemplate) {

    return backbone.View.extend({
        el: "#page-content",
        initialize: function (options) {
            this.vent = options.vent;

            this.template = _.template(calendarTemplate);
            this.raidListItemTemplate = _.template(raidListItemTemplate);
            this.loadingTemplate = _.template(loadingTemplate);
        },

        render: function (type, date) {
            var self = this,
                calendar,
                $calendar,
                options;

            $(self.el).html(self.template({}));
            $calendar = $("#calendar-div");
            $calendar.html(self.loadingTemplate());


            options = {
                language: window.Translator.translate("language.iso"),
                events_source: "api/raids/getInTime",
                tmpl_path: "calendarTemplates/",
                time_start: "00:00",
                time_end: "24:00",
                onAfterViewLoad: function (view) {
                    $('.calendar-title').text(this.getTitle());
                    $(".calendar-view .btn").removeClass('active');
                    $(".calendar-view .btn[data-calendar-view=" + view + "]").addClass('active');
                },
                onAfterEventsLoad: function (events) {
                    if (!events) {
                        return;
                    }
                    var $plannedEvents = $('#plannedEvents'),
                        $pastEvents    = $('#pastEvents'),
                        currentTime    = new Date().getTime(),
                        eventsInFuture = 0,
                        eventsInPast   = 0,
                        startThreshold = currentTime + 64800000, // 18 hours before raid
                        endThreshold   = currentTime - 10800000; // 3 hours

                    $plannedEvents.empty();
                    $pastEvents.empty();

                    $.each(events, function (key, raid) {
                        var template = self.raidListItemTemplate({
                            raid: raid,
                            isCurrent: raid.start < startThreshold && raid.end > endThreshold
                        });
                        if (raid.end < currentTime) {
                            eventsInPast = eventsInPast + 1;
                            $pastEvents.prepend(template);
                            if (eventsInPast > 5) {
                                $pastEvents.find("li:last").remove();
                            }
                        } else {
                            eventsInFuture = eventsInFuture + 1;
                            if (eventsInFuture <= 5) {
                                $plannedEvents.append(template);
                            }
                        }
                    });

                    if (eventsInFuture === 0) {
                        $plannedEvents.append("<li>" + window.Translator.translate("calendar.noPlannedEvents") + "</li>");
                    }
                    if (eventsInPast === 0) {
                        $pastEvents.append("<li>" + window.Translator.translate("calendar.noPastEvents") + "</li>");
                    }
                    $(".plannedEvents, .pastEvents").find("[data-toggle='tooltip']").tooltip();
                },
                classes: {
                    months: {
                        general: 'label'
                    }
                }
            };

            if (type) {
                options.view = type;
            }
            if (date) {
                options.day = date;
            }

            calendar = $calendar.calendar(options);

            $('.btn-group button[data-calendar-nav]').click(function () {
                $calendar.html(self.loadingTemplate());
                calendar.navigate($(this).data('calendar-nav'));
                $(this).blur();
                self.vent.trigger('Router:ChangeUrl', 'calendar/' + calendar.options.view + "/" + calendar.options.day, true);
            });

            $('.btn-group button[data-calendar-view]').click(function () {
                $calendar.html(self.loadingTemplate());
                calendar.view($(this).data('calendar-view'));
                $(this).blur();
                self.vent.trigger('Router:ChangeUrl', 'calendar/' + calendar.options.view + "/" + calendar.options.day, true);
            });

            $('.events-list').click(function (e) {
                e.stopPropagation();
            });

            this.menu = new MenuView({vent: this.vent});
            this.menu.render();
        }
    });
});