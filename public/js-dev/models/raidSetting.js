/*global define */
"use strict";

define('models/raidSetting', [
    'jquery',
    'underscore',
    'backbone'
], function ($, _, backbone) {
    return backbone.Model.extend({
        idAttribute: "_id"
    });
});