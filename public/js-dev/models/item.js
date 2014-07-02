/*global define */
"use strict";

define('models/item', [
    'jquery',
    'underscore',
    'backbone'
], function ($, _, backbone) {
    return backbone.Model.extend({
        idAttribute: "_id"
    });
});