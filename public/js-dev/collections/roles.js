/*global define */

"use strict";

define("collections/roles", [
    "jquery",
    "underscore",
    "backbone",
    "models/role"
], function ($, _, backbone, RoleModel) {
    return backbone.Collection.extend({
        model: RoleModel,
        loaded: false,
        fetch: function (callback) {
            var self = this;
            $.ajax({
                url: "api/roles",
                success: function (data) {
                    if (data.success) {
                        self.reset(data.roles);
                        self.loaded = true;
                        callback(null, data.roles);
                    } else {
                        callback(new Error());
                    }
                }
            });
        }
    });
});
