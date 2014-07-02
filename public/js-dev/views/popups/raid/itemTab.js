/*global define, window */

"use strict";

define('views/popups/raid/itemTab', [
    'jquery',
    'underscore',
    'backbone',
    'collections/items',
    'text!templates/popups/raid/itemTab.ejs',
    'models/raid'
], function ($, _, backbone, ItemCollection, template, RaidModel) {

    function getItems(raid) {
        function sortFunction(a, b) {
            return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
        }

        var items = [],
            itemObject = {};
        if (!raid.attributes.userItems) {
            return items;
        }
        _.each(raid.attributes.userItems, function (userItems, userId) {
            _.each(userItems, function (itemData, itemId) {
                var userObject = {
                    name:   itemData.userName,
                    amount: itemData.amount
                };
                if (!itemObject[itemId]) {
                    itemObject[itemId] = {
                        name: itemData.name,
                        users: [userObject]
                    };
                } else {
                    itemObject[itemId].users.push(userObject);
                }
            });
        });

        _.each(itemObject, function (itemData) {
            itemData.users.sort(sortFunction);
            items.push(itemData);
        });

        items.sort(sortFunction);

        return items;
    }

    return backbone.View.extend({
        initialize: function (options) {
            this.vent = options.vent;

            this.template = _.template(template);
        },

        render: function (raid) {
            var self       = this,
                items;

            self.raid  = raid || self.raid;
            items = getItems(self.raid);

            $(self.el).html(self.template({
                items: items
            }));
        }
    });
});