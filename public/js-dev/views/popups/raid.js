/*global define, window, Roles, UserData, document */

"use strict";

define('views/popups/raid', [
    'jquery',
    'underscore',
    'backbone',
    'models/raid',
    'lib/bootstrap-select',
    'lib/bootstrap-typeahead',
    'text!templates/popups/raid.ejs',
    'text!templates/popups/raid/affirmedListItem.ejs',
    'text!templates/popups/raid/affirmedListItemCharacter.ejs',
    'text!templates/popups/raid/signedUpListItem.ejs',
    'text!templates/popups/raid/signedUpListItemCharacter.ejs',
    'text!templates/popups/raid/addAffirmedListItemCharacter.ejs',
    'views/popups/editRaid',
    'views/popups/raid/signedOffTab',
    'views/popups/raid/commentsTab',
    'views/popups/raid/dkpTab',
    'views/popups/raid/itemTab'
], function ($, _, backbone, RaidModel, bootstrapSelect, bootstrapTypeAhead, raidPopup,
             affirmedListItem, affirmedListItemCharacter,
             signedUpListItem, signedUpListItemCharacter,
             addAffirmedListItemCharacter,
             RaidPopupView,
             SignedOffTabView, CommentsTabView, DKPTabView, ItemTabView
    ) {

    var tabViews = {
        signedOffTab: SignedOffTabView,
        commentsTab:  CommentsTabView,
        dkpTab:       DKPTabView,
        itemTab:      ItemTabView
    };

    return backbone.View.extend({
        className: "dkp_modal modal_raid modal fade",
        attributes: {
            "tabindex": -1
        },
        events: {
            "click .signUp": "signUp",
            "click .removeSignUp": "removeSignUp",
            "click .affirm": "affirm",
            "click .removeAffirmation": "removeAffirmation",
            "click .editRaid": "editRaid",
            "submit .addAffirmedCharacter": "addAffirmedCharacter"
        },
        initialize: function (options) {
            this.vent = options.vent;
            this.template = _.template(raidPopup);

            this.affirmedListItem             = _.template(affirmedListItem);
            this.affirmedListItemCharacter    = _.template(affirmedListItemCharacter);
            this.signedUpListItem             = _.template(signedUpListItem);
            this.signedUpListItemCharacter    = _.template(signedUpListItemCharacter);
            this.addAffirmedListItemCharacter = _.template(addAffirmedListItemCharacter);
        },

        render: function (id, tab, reloadModal) {
            var self = this,
                raid = new RaidModel();

            if (reloadModal === null || reloadModal === undefined) {
                reloadModal = true;
            }

            raid.fetch(id, function (error, raid) {
                if (error) {
                    self.vent.trigger('Router:Back');
                    self.vent.trigger('Alert:Error', error);
                    return;
                }

                var raidAttributes = raid.attributes,
                    $template,
                    $affirmedList,
                    $signedUpList,
                    takesSignups = false,
                    signupCount = {},
                    affirmedCount = 0,
                    signupsNeeded = 0;

                self.raid = raid;

                if (!raidAttributes.affirmed) {
                    raidAttributes.affirmed = {};
                    _.each(raidAttributes.roles, function (name, id) {
                        raidAttributes.affirmed[id] = {};
                    });
                }
                if (!raidAttributes.signedUp) {
                    raidAttributes.signedUp = {};
                    _.each(raidAttributes.roles, function (name, id) {
                        raidAttributes.signedUp[id] = {};
                    });
                }
                if (raidAttributes.roles) {
                    _.some(raidAttributes.roles, function (roleAmount, id) {
                        if (roleAmount && roleAmount > 0) {
                            takesSignups = true;
                            return true;
                        }
                    });
                }

                _.each(raidAttributes.signedUp, function (users) {
                    _.each(users, function (data, userId) {
                        if (signupCount[userId]) {
                            signupCount[userId] = signupCount[userId] + 1;
                        } else {
                            signupCount[userId] = 1;
                        }
                    });
                });
                self.raid.signupCount = signupCount;

                _.each(raidAttributes.affirmed, function (users) {
                    affirmedCount = affirmedCount + _.size(users);
                });

                _.each(raidAttributes.roles, function (amountToGet, roleId) {
                    signupsNeeded = signupsNeeded + amountToGet;
                });

                $template = $(self.template({
                    raid: raidAttributes,
                    takesSignups:   takesSignups,
                    signupAmount:   _.size(signupCount),
                    affirmedAmount: affirmedCount,
                    signupsNeeded:  signupsNeeded
                }));

                if (raidAttributes.commentAmount > 0) {
                    $("#badge", $template).addClass("badge").text(raidAttributes.commentAmount);
                }


                $affirmedList = $("#affirmedList", $template);
                _.each(raidAttributes.roles, function (amountToGet, roleId) {
                    if (amountToGet <= 0) {
                        return;
                    }
                    var affirmedAmount = _.size(raidAttributes.affirmed[roleId]),
                        $listItem       = $(self.affirmedListItem({
                            affirmedAmount: affirmedAmount,
                            amountToGet:    amountToGet,
                            alertClass:     affirmedAmount === amountToGet ? "alert-success" : affirmedAmount > amountToGet ? "alert-danger" : "",
                            roleName:       Roles[roleId],
                            roleId:         roleId
                        })),
                        $characterList = $(".characterList", $listItem),
                        characterArray = raidAttributes.affirmed[roleId] ? _.keys(raidAttributes.affirmed[roleId]) : [],
                        sortedList = {};

                    // sorting by name
                    characterArray.sort(function (userA, userB) {
                        return raidAttributes.affirmed[roleId][userA].name.toLowerCase() > raidAttributes.affirmed[roleId][userB].name.toLowerCase();
                    });

                    _.each(characterArray, function (userId) {
                        sortedList[userId] = raidAttributes.affirmed[roleId][userId];
                    });

                    _.each(sortedList, function (charData, charId) {
                        $characterList.append(self.affirmedListItemCharacter({
                            alertClass: UserData.id === charId ? "alert-success" : "alert-info",
                            charName:   charData.name,
                            charId:     charId
                        }));
                    });

                    if (UserData.isAdmin && raidAttributes.userList && raidAttributes.userList.length > 0) {
                        $characterList.append(self.addAffirmedListItemCharacter({
                            roleId: roleId,
                            userList: raidAttributes.userList
                        }));
                        $("[data-provide='typeahead']", $characterList).typeahead({
                            source: raidAttributes.userList
                        });
                    }

                    $affirmedList.append($listItem);
                });

                $signedUpList = $("#signedUpList", $template);
                _.each(raidAttributes.roles, function (amountToGet, roleId) {
                    if (amountToGet <= 0) {
                        return;
                    }
                    var signedUpAmount     = _.size(raidAttributes.signedUp[roleId]),
                        $listItem       = $(self.signedUpListItem({
                            amountToGet:    amountToGet,
                            signedUpAmount: signedUpAmount,
                            alertClass:     signedUpAmount >= amountToGet ? "alert-success" : "",
                            isSignedUp:     raid.isSignedUp(UserData.id),
                            signedUpHere:   raidAttributes.signedUp[roleId] && raidAttributes.signedUp[roleId][UserData.id],
                            roleName:       Roles[roleId],
                            roleId:         roleId
                        })),
                        $characterList = $(".characterList", $listItem),
                        characterArray = raidAttributes.signedUp[roleId] ? _.keys(raidAttributes.signedUp[roleId]) : [],
                        sortedList = {};

                    // sorting by name
                    characterArray.sort(function (userA, userB) {
                        return raidAttributes.signedUp[roleId][userA].name.toLowerCase() > raidAttributes.signedUp[roleId][userB].name.toLowerCase();
                    });

                    _.each(characterArray, function (userId) {
                        sortedList[userId] = raidAttributes.signedUp[roleId][userId];
                    });

                    _.each(sortedList, function (charData, charId) {
                        var isCharAffirmed = raid.isAffirmed(charId);
                        $characterList.append(self.signedUpListItemCharacter({
                            isCharAffirmed: isCharAffirmed,
                            affirmedHere:   raidAttributes.affirmed[roleId] && raidAttributes.affirmed[roleId][charId],
                            charName:       charData.name,
                            charId:         charId,
                            roleId:         roleId,
                            signupCount:    signupCount[charId] || 0
                        }));
                    });

                    $signedUpList.append($listItem);
                });

                $("[data-toggle='tooltip']", $template).tooltip();
                $("[data-toggle='popover']", $template).popover();

                $(self.el).html($template);


                if (reloadModal) {
                    $("#popup").html(self.el);
                    $(self.el).modal('show');
                    $(self.el).on('hidden.bs.modal', function () {
                        $(self.el).off('hidden.bs.modal');
                        $(self.el).remove();
                        self.vent.trigger("Router:Back");
                    });
                }

                $("a.tab-load").each(function () {
                    var $this = $(this);
                    $this.on('show.bs.tab', function () {
                        var tabId   = $this.attr("href"),
                            tabView = new tabViews[tabId.replace(/^#/, "")]({ vent: self.vent, el: tabId});

                        $this.off('show.bs.tab');
                        tabView.render(self.raid);
                    });
                });

                $('.nav-tabs a').on('shown.bs.tab', function (e) {
                    var tabName = e.target.className.replace(/^tab-([a-z]+).*/i, "$1");
                    self.vent.trigger('Router:ChangeUrl', "raid/" + self.raid.id + "/" + tabName);
                });

                if (tab) {
                    $('a.tab-' + tab).click();
                }
            });
        },

        signUp: function (e) {
            var self    = this,
                $button = $(e.target).closest('a'),
                roleId  = $button.data("role-id");
            e.preventDefault();

            $.ajax({
                url: "api/raids/changeUser",
                data: {
                    type:   "signUp",
                    raidId: self.raid.id,
                    roleId: roleId
                },
                success: function (data) {
                    if (!data.success) {
                        self.vent.trigger('Alert:Error', data.data, '.dkp_modal');
                    } else {
                        $button.siblings('.characterList').append(
                            $(self.signedUpListItemCharacter({
                                isCharAffirmed: false,
                                affirmedHere:   false,
                                charName:       UserData.characters[0].name,
                                charId:         UserData.id,
                                roleId:         roleId,
                                signupCount:    self.raid.signupCount[UserData.id] + 1 || 1
                            })).hide().fadeIn("fast", function () {
                                self.render(self.raid.id, null, false);
                            })
                        );
                    }
                }
            });
        },

        removeSignUp: function (e) {
            var self = this,
                $button = $(e.target).closest('a'),
                roleId  = $button.data("role-id");
            e.preventDefault();

            $.ajax({
                url: "api/raids/changeUser",
                data: {
                    type:   "removeSignUp",
                    raidId: self.raid.id,
                    roleId: roleId
                },
                success: function (data) {
                    var alreadyRendering = false;
                    if (!data.success) {
                        self.vent.trigger('Alert:Error', data.data, '.dkp_modal');
                    } else {
                        $(".characterList[data-role-id='" + roleId + "']").find('a[data-id=' + UserData.id + "]").parents('.character').fadeOut(function () {
                            if (!alreadyRendering) {
                                alreadyRendering = true;
                                self.render(self.raid.id, null, false);
                            }
                        });
                    }
                }
            });
        },

        affirm: function (e) {
            var self    = this,
                $button = $(e.target).closest('a'),
                charId  = $button.data("id"),
                roleId  = $button.data("role-id");
            e.preventDefault();

            $.ajax({
                url: "api/raids/changeUser",
                data: {
                    type:   "affirm",
                    raidId: self.raid.id,
                    charId: charId,
                    roleId: roleId
                },
                success: function (data) {
                    if (!data.success) {
                        self.vent.trigger('Alert:Error', data.data, '.dkp_modal');
                    } else {
                        var $affirmedList = $("#affirmedList").find('.characterList[data-role-id="' + roleId + '"]'),
                            charName      = $button.data("name");

                        $affirmedList.append(
                            $(self.affirmedListItemCharacter({
                                alertClass: UserData.id === $button.data("id") ? "alert-success" : "alert-info",
                                charName:   charName,
                                charId:     charId
                            })).hide().fadeIn("fast", function () {
                                self.render(self.raid.id, null, false);
                            })
                        );
                    }
                }
            });
        },

        removeAffirmation: function (e) {
            var self    = this,
                $button = $(e.target).closest('a'),
                charId  = $button.data("id");
            e.preventDefault();

            $.ajax({
                url: "api/raids/changeUser",
                data: {
                    type:   "removeAffirmation",
                    raidId: self.raid.id,
                    charId: charId
                },
                success: function (data) {
                    if (!data.success) {
                        self.vent.trigger('Alert:Error', data.data, '.dkp_modal');
                    } else {
                        $button.parents('.character').fadeOut("fast", function () {
                            self.render(self.raid.id, null, false);
                        });
                    }
                }
            });
        },

        editRaid: function () {
            var self          = this,
                raidPopupView = new RaidPopupView({vent: this.vent});
            $('.modal_raid').off('hide.bs.modal');
            $('.modal_raid').on('hidden.bs.modal', function () {
                $(this).off('hidden.bs.modal');
                raidPopupView.render(self.raid.attributes);
            });
            $('.modal_raid').modal('hide');
        },

        addAffirmedCharacter: function (e) {
            var self    = this,
                $form    = $(e.target).closest('form'),
                charName = $form.find('.charName').val(),
                roleId   = $form.data("role-id");
            e.preventDefault();

            if (!charName.trim().match(/^[a-zA-Z0-9 \-]{3,}$/)) {
                return self.vent.trigger('Alert:Error', window.Translator.translate("raid.nameInvalid"));
            }

            $.ajax({
                url: "api/raids/changeUser",
                data: {
                    type:   "addAffirm",
                    raidId: self.raid.id,
                    charName: charName,
                    roleId: roleId
                },
                success: function (data) {
                    if (!data.success) {
                        self.vent.trigger('Alert:Error', data.data, '.dkp_modal');
                    } else {
                        self.render(self.raid.id, null, false);
                    }
                }
            });
        }
    });
});