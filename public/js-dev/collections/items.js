/*global define */

"use strict";

define("collections/items", [
    "jquery",
    "underscore",
    "backbone",
    "models/item"
], function ($, _, backbone, ItemModel) {
    return backbone.Collection.extend({
        model: ItemModel,
        fetch: function (callback) {
            var self = this;
            $.ajax({
                url: "api/items/get",
                success: function (data) {
                    if (data.success) {
                        self.reset(data.items);
                        callback(null, data.items);
                    } else {
                        callback(new Error());
                    }
                }
            });
        }
    });
});
