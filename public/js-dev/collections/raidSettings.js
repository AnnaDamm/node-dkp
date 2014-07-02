/*global define */

"use strict";

define("collections/raidSettings", [
    "jquery",
    "underscore",
    "backbone",
    "models/raidSetting"
], function ($, _, backbone, RaidSettingModel) {
    return backbone.Collection.extend({
        model: RaidSettingModel,
        fetch: function (callback) {
            var self = this;
            $.ajax({
                url: "api/raidSettings/get",
                success: function (data) {
                    if (data.success) {
                        self.reset(data.raidSettings);
                        callback(null, data.raidSettings);
                    } else {
                        callback(new Error());
                    }
                }
            });
        }
    });
});
