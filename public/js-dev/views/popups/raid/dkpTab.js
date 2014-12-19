/*global define, window */

"use strict";

define('views/popups/raid/dkpTab', [
    'jquery',
    'underscore',
    'backbone',
    'collections/items',
    'text!templates/popups/raid/dkpTab.ejs',
    'models/raid'
], function ($, _, backbone, ItemCollection, template, RaidModel) {

    function addError($input) {
        $input.parents('.form-group')
            .removeClass('has-success')
            .addClass('has-error')
            .addClass('has-feedback');
    }

    function getDkp(wasUserPresent, raid) {
        if (!wasUserPresent) {
            return raid.attributes.dkp.absent;
        }
        if (raid.attributes.success === true) {
            return raid.attributes.dkp.present + raid.attributes.dkp.killbonus;
        }
        return raid.attributes.dkp.present;
    }

    function getCharacters(raid) {
        var characters = {},
            characterArray,
            sortedCharacters = {},
            charactersInRole,
            role,
            characterId,
            character,
            punishishingTime;

        if (raid.attributes.affirmed) {
            for (role in raid.attributes.affirmed) {
                if (!raid.attributes.affirmed.hasOwnProperty(role)) {
                    continue;
                }
                charactersInRole = raid.attributes.affirmed[role];
                for (characterId in charactersInRole) {
                    if (!charactersInRole.hasOwnProperty(characterId)) {
                        continue;
                    }
                    characters[characterId] = {
                        name: charactersInRole[characterId].name,
                        dkp: getDkp(true, raid)
                    };
                }
            }
        }
        if (raid.attributes.signedOff) {
            if (raid.attributes.signOffPunishingTime && raid.attributes.signOffPunishingTime > 0) {
                punishishingTime = new Date(raid.attributes.date).getTime() - raid.attributes.signOffPunishingTime; // 6 hours
                for (characterId in raid.attributes.signedOff) {
                    if (!raid.attributes.signedOff.hasOwnProperty(characterId)) {
                        continue;
                    }
                    character = raid.attributes.signedOff[characterId];

                    // only affirmed users are punished
                    if (!character.wasAffirmed) {
                        continue;
                    }

                    // only users that signed off within the last few hours are punished
                    if (new Date(character.date).getTime() < punishishingTime) {
                        continue;
                    }
                    characters[characterId] = {
                        name: character.name,
                        dkp: getDkp(false, raid)
                    };
                }
            }
        }

        for (characterId in raid.attributes.dkpGiven) {
            if (!raid.attributes.dkpGiven[characterId]) {
                continue;
            }
            characters[characterId] = raid.attributes.dkpGiven[characterId];
        }

        // sorting by name
        characterArray = _.keys(characters);
        characterArray.sort(function (userA, userB) {
            return characters[userA].name.toLowerCase() > characters[userB].name.toLowerCase() ? 1 : -1;
        });

        _.each(characterArray, function (userId) {
            sortedCharacters[userId] = characters[userId];
        });

        if (raid.attributes.userItems) {
            _.each(_.keys(raid.attributes.userItems), function (userId) {
                if (sortedCharacters[userId]) {
                    sortedCharacters[userId].items = raid.attributes.userItems[userId];
                }
            });
        }

        return sortedCharacters;
    }

    return backbone.View.extend({
        events: {
            "click .present-button": "changePresentState",
            "click #raidsuccess": "changeKillBonusState",
            "click .removeItem": "removeItem",
            "submit #dkp": "giveDkp",
            "submit #giveItem": "giveItem",
            "change #itemNeeded": "dkpChanged",
            "change #itemId": "dkpChanged"
        },
        initialize: function (options) {
            this.vent = options.vent;

            this.template = _.template(template);
        },

        render: function (raid) {
            var self       = this,
                characters;

            self.raid  = raid || self.raid;
            characters = getCharacters(self.raid);
            self.raid.attributes.dkpGiven = characters;

            $(self.el).html(self.template({
                raid: self.raid.attributes,
                characters: characters
            }));
            $("[data-toggle='tooltip']", self.el).tooltip();
            $("[data-toggle='popover']", self.el).popover();
            $("select", self.el).selectpicker();
        },
        changePresentState: function (e) {
            var $button     = $(e.target).closest("button"),
                characterId = $button.data("id"),
                wasPresent  = $button.hasClass('was-present');

            this.raid.attributes.dkpGiven[characterId].dkp = getDkp(wasPresent, this.raid);
            this.render();
        },

        changeKillBonusState: function (e) {
            var wasSuccess = !this.raid.attributes.success,
                characterId;

            this.raid.attributes.success = wasSuccess;

            for (characterId in this.raid.attributes.dkpGiven) {
                if (this.raid.attributes.dkpGiven.hasOwnProperty(characterId)) {
                    this.raid.attributes.dkpGiven[characterId].dkp = getDkp(
                        this.raid.attributes.dkpGiven[characterId].dkp >= 0,
                        this.raid
                    );
                }
            }

            this.render();
        },

        giveDkp: function (e) {
            var self    = this,
                $button = $("#givedkpButton");
            e.preventDefault();

            if ($button.hasClass('disabled')) {
                return;
            }

            $button.addClass('disabled')
                .attr('disabled', 'disabled');

            $.ajax({
                url: "api/dkp/setInRaid",
                data: $("#dkp").serialize(),
                success: function (data) {
                    $button.removeAttr('disabled')
                        .removeClass('disabled');

                    if (data.success) {
                        self.vent.trigger('Alert:Success', window.Translator.translate("raid.dkpTab.dkpGivenSuccessful"), ".modal_raid .modal-body");
                    } else {
                        self.vent.trigger('Alert:Error', data.data, ".modal_raid .modal-body");
                    }
                }
            });
        },
        rerender: function (callback) {
            var self = this,
                raid = new RaidModel();
            raid.fetch(this.raid.attributes._id, function (error, raid) {
                if (!error) {
                    self.render(raid);
                }
                callback(error, raid);
            });
        },
        giveItem: function (e) {
            var self    = this,
                $button = $("#giveItemButton");
            e.preventDefault();

            if ($button.hasClass('disabled')) {
                return;
            }

            $button.addClass('disabled')
                .attr('disabled', 'disabled');

            $.ajax({
                url: "api/dkp/giveItem",
                data: $("#giveItem").serialize(),
                success: function (data) {
                    $button.removeAttr('disabled')
                        .removeClass('disabled');

                    if (data.success) {
                        self.rerender(function (error) {
                            if (error) {
                                self.vent.trigger('Alert:Error', error, ".modal_raid .modal-body");
                            } else {
                                self.vent.trigger('Alert:Success', window.Translator.translate("raid.dkpTab.itemGivenSuccessful"), ".modal_raid .modal-body");
                            }
                        });
                    } else {
                        self.vent.trigger('Alert:Error', data.data, ".modal_raid .modal-body");
                    }
                }
            });
        },
        removeItem: function (e) {
            var self    = this,
                $button = $(e.target).closest('.removeItem');

            e.preventDefault();

            $.ajax({
                url: "api/dkp/removeItem",
                data: {
                    id: $button.data('id')
                },
                success: function (data) {
                    if (data.success) {
                        self.rerender(function (error) {
                            if (error) {
                                self.vent.trigger('Alert:Error', error, ".modal_raid .modal-body");
                            } else {
                                self.vent.trigger('Alert:Success', window.Translator.translate("raid.dkpTab.itemRemovedSuccessful"), ".modal_raid .modal-body");
                            }
                        });
                    } else {
                        self.vent.trigger('Alert:Error', data.data, ".modal_raid .modal-body");
                    }
                }
            });
        },
        dkpChanged: function (e) {
            var isNeed         = $("#itemNeeded").prop('checked'),
                itemId         = $("#itemId").val(),
                stringToLookup = isNeed ? "need" : "greed",
                newValue       = -this.raid.attributes.items[itemId].dkp[stringToLookup];

            $("#itemDkp").val(newValue);
        }

    });
});