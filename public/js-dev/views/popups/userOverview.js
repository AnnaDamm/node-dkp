/*global define, window */

"use strict";

define('views/popups/userOverview', [
    'jquery',
    'underscore',
    'backbone',
    'collections/users',
    'models/userHistory',
    'text!templates/popups/userOverview.ejs',
    'text!templates/popups/userOverview/userListItem.ejs',
    'text!templates/popups/userOverview/userDetailTable.ejs',
    'text!templates/popups/userOverview/userDetailRow.ejs'
], function ($, _, backbone, UserCollection, UserHistory, userOverview, userListItem, userDetailTable, userDetailRow) {


    return backbone.View.extend({
        className: "dkp_modal modal_userOverview modal fade",
        attributes: {
            "tabindex": -1
        },
        events: {
            'click .userDetails': 'userDetailsClicked',
            'click .raidLink': 'raidLinkClicked'
        },
        initialize: function (options) {
            this.vent = options.vent;

            this.template        = _.template(userOverview);
            this.userListItem    = _.template(userListItem);
            this.userDetailTable = _.template(userDetailTable);
            this.userDetailRow   = _.template(userDetailRow);
        },

        render: function (userId) {
            var self = this,
                $el  = $(self.el),
                userCollection = new UserCollection();

            self.vent.trigger("User:ReloadDkp");

            userCollection.fetch(function (error, users) {
                var $dkpPlusList,
                    $allUsersList,
                    $dkpMinusList,
                    hasPlus  = false,
                    hasMinus = false;

                if (error) {
                    return self.vent.trigger("Alert:Error", window.Translator.translate("userOverview.loadFailed"));
                }

                $el.html(self.template());

                $dkpPlusList = $("#dkpPlusList", $el);
                $dkpMinusList = $("#dkpMinusList", $el);
                $allUsersList = $("#allUsersList", $el);

                _.each(users.models, function (user) {
                    if (!user.attributes.isBanned) {
                        var userTemplate = self.userListItem({
                            user: user.attributes
                        });
                        if (user.attributes.dkp >= 0) {
                            $dkpPlusList.append(userTemplate);
                            hasPlus = true;
                        } else {
                            $dkpMinusList.append(userTemplate);
                            hasMinus = true;
                        }

                        $allUsersList.append(userTemplate);
                    }
                });

                if (!hasPlus || !hasMinus) {
                    $('.nav-tabs', $el).hide();
                }

                $el.on('hidden.bs.modal', function () {
                    $(this).off('hidden.bs.modal');
                    $el.remove();
                    self.vent.trigger("Router:Back");
                }).modal('show');

                if (userId) {
                    $('#allUsersList .userDetails[data-id="' + userId + '"]', self.el).click();
                }
            });
        },
        userDetailsClicked: function (e) {
            var self   = this,
                $el    = $(self.el),
                $div   = $(e.target).closest('.userDetails'),
                userId = $div.data('id'),

                userHistory = new UserHistory(),
                userTable   = $el.find('.userDetailTable.user-' + userId),
                $userDiv    = userTable.parent();

            e.preventDefault();

            $el.find('.userDetails:not([data-id="' + userId + '"])').removeClass('active');
            $el.find('.userDetailTable:not(.user-' + userId + ')').parent().hide();
            $el.find('.userDetails[data-id="' + userId + '"]').toggleClass('active');

            if ($userDiv.length > 0) {
                if ($userDiv.is(':visible')) {
                    self.vent.trigger('Router:ChangeUrl', "members");
                } else {
                    self.vent.trigger('Router:ChangeUrl', "members/" + userId);
                }
                $userDiv.fadeToggle();
            } else {
                userHistory.fetch(userId, function (error, history) {
                    if (error) {
                        return self.trigger('Alert:Error', error, ".modal_userOverview .clearfix:last-child");
                    }
                    var $detailTable = $(self.userDetailTable({
                            userId: userId,
                            userName: $div.find('.name').text()
                        })).hide(),
                        $body = $detailTable.find('tbody');

                    _.each(history.attributes, function (row) {
                        $body.append(self.userDetailRow({
                            row: row
                        }));
                    });

                    $div.parents('.tab-content').after($detailTable.fadeIn());

                    self.vent.trigger('Router:ChangeUrl', "members/" + userId);
                });
            }
        },

        raidLinkClicked: function () {
            var $el = $(this.el);
            $el.off('hidden.bs.modal')
                .on('hidden.bs.modal', function () {
                    $(this).off('hidden.bs.modal');
                    $el.remove();
                })
                .modal('hide');
        }
    });
});