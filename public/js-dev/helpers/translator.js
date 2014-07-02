/*global define, window, Translations */

"use strict";

define('helpers/translator', [], function () {

    function formatKey(string) {
        var args = Array.prototype.slice.call(arguments, 1);
        return string.replace(/\{(\d+)\}/g, function (match, number) {
            return args[number] !== undefined ? args[number] : match;
        });
    }


    function translate(key) {
        var translation,
            parameters;

        if (Translations.hasOwnProperty(key)) {
            translation = Translations[key];
        } else {
            translation = key;
        }

        if (arguments.length > 1) {
            parameters = [translation].concat(Array.prototype.slice.call(arguments, 1));
            translation = formatKey.apply(this, parameters);
        }

        return translation;
    }

    return {
        translate: translate
    };
});