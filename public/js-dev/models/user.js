/*global define*/

"use strict";

define('models/user', [
    'jquery',
    'underscore',
    'backbone'
], function ($, _, backbone) {
    return backbone.Model.extend({
        idAttribute: "_id"
    });
});