/*global define */
"use strict";

define('models/raid', [
    'jquery',
    'underscore',
    'backbone'
], function ($, _, backbone) {

    function isInArray(id, array) {
        var roleId;
        for (roleId in array) {
            if (array.hasOwnProperty(roleId)) {
                if (array[roleId][id]) {
                    return true;
                }
            }
        }
        return false;
    }

    return backbone.Model.extend({
        idAttribute: "_id",
        fetch: function (id, callback) {
            var model = this;
            $.ajax({
                url: "api/raids/get",
                data: $.param({
                    id: id
                }),
                success: function (data) {
                    if (data.success) {
                        model.set(model.parse(data.raid), {});
                        callback(null, model);
                    } else {
                        callback(new Error(data.data));
                    }
                },
                error: function (error) {
                    callback(error);
                }
            });
        },

        isSignedUp: function (id) {
            return isInArray(id, this.attributes.signedUp);
        },

        isSignedUpAsRole: function (id, roleId) {
            return this.attributes.signedUp.hasOwnProperty(roleId) && this.attributes.signedUp[roleId].hasOwnProperty(id);
        },

        isAffirmed: function (id) {
            return isInArray(id, this.attributes.affirmed);
        },

        isAffirmedAsRole: function (id, roleId) {
            return this.attributes.affirmed.hasOwnProperty(roleId) && this.attributes.affirmed[roleId].hasOwnProperty(id);
        }
    });
});