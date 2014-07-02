/*global define */

"use strict";

define("collections/users", [
    "jquery",
    "underscore",
    "backbone",
    "models/user"
], function ($, _, backbone, ItemModel) {
    return backbone.Collection.extend({
        model: ItemModel,
        fetch: function (callback) {
            var self = this;
            $.ajax({
                url: "api/user/getAll",
                success: function (data) {
                    if (data.success) {
                        self.reset(data.users);
                        callback(null, self);
                    } else {
                        callback(new Error());
                    }
                }
            });
        }
    });
});
