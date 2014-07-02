/*global define */
"use strict";

define('models/userHistory', [
    'jquery',
    'underscore',
    'backbone'
], function ($, _, backbone) {
    return backbone.Model.extend({
        idAttribute: "_id",
        fetch: function (userId, callback) {
            var model = this;
            $.ajax({
                url: "api/dkp/getUserHistory",
                data: $.param({
                    userId: userId
                }),
                success: function (data) {
                    if (data.success) {
                        model.set(model.parse(data.history), {});
                        callback(null, model);
                    } else {
                        callback(new Error(data.data));
                    }
                },
                error: function (error) {
                    callback(error);
                }
            });
        }
    });
});