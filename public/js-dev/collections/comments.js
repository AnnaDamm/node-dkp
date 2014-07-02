/*global define */

"use strict";

define("collections/comments", [
    "jquery",
    "underscore",
    "backbone",
    "models/comment"
], function ($, _, backbone, RoleModel) {
    return backbone.Collection.extend({
        model: RoleModel,
        loaded: false,
        fetch: function (raidId, callback) {
            var self = this;
            $.ajax({
                url: "api/comments/get",
                data: {
                    raidId: raidId
                },
                success: function (data) {
                    if (data.success) {
                        self.reset(data.comments);
                        self.loaded = true;
                        callback(null, data.comments);
                    } else {
                        callback(new Error());
                    }
                },
                error: function (xhr) {
                    callback(xhr.statusText);
                }
            });
        }
    });
});
