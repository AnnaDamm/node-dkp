/*global define, window */

"use strict";

define('views/popups/items', [
    'jquery',
    'underscore',
    'backbone',
    'lib/bootstrap-select',
    'collections/items',
    'text!templates/popups/items.ejs',
    'text!templates/popups/items/form.ejs'
], function ($, _, backbone, bootstrapSelect, ItemCollection, itemsPopup, itemForm) {

    function addError($input) {
        $input.parents('.form-group')
            .removeClass('has-success')
            .addClass('has-error')
            .addClass('has-feedback');
    }

    return backbone.View.extend({
        className: "dkp_modal modal_items modal fade",
        attributes: {
            "tabindex": -1
        },
        loginChecked: false,
        events: {
            "change .items": "showItem",
            "submit #itemform": "updateItem",
            "click #deleteitem": "deleteItem"
        },
        initialize: function (options) {
            this.vent = options.vent;

            this.template = _.template(itemsPopup);
            this.itemFormTemplate = _.template(itemForm);
        },

        render: function () {
            var self = this;

            this.itemCollection = new ItemCollection();

            this.reloadPopup(function (items) {
                $("#popup").html(self.el);
                $('.dkp_modal').modal('show');

                if (items.length > 0) {
                    $("select").selectpicker('val', items[0]._id);
                } else {
                    $("select").trigger("change");
                }
            });
        },

        showItem: function (e) {
            var itemId = $(e.target).val(),
                item = this.itemCollection.get(itemId),
                itemData = {
                    name: "",
                    dkp: {
                        need: "",
                        greed: ""
                    }
                };

            if (itemId !== "" && item) {
                itemData = item.attributes;
            }

            $("#itemdata").html(this.itemFormTemplate({
                item: itemData
            }));

            if (!itemId) {
                $("#itemname").focus();
            }

            $("[data-toggle=popover]").popover();
        },

        reloadPopup: function (callback) {
            var self = this;

            self.itemCollection.fetch(function (error, items) {
                if (error) {
                    return self.vent.trigger('Alert:Error', window.Translator.translate("items.loadFailed"), self.el);
                }
                $(self.el).html(
                    self.template({
                        items: items
                    })
                );
                $("select", self.el).selectpicker();

                callback(items);
            });
        },

        updateItem: function (e) {
            var self  = this,
                $form = $("#itemform");

            e.preventDefault();

            $.ajax({
                url: "api/items/update",
                data: $form.serialize(),
                success: function (data) {
                    var errorFields;

                    if (data.success === true) {
                        self.reloadPopup(function () {
                            $("select").selectpicker('val', data.item._id);
                        });
                    } else {
                        if (data.data.length) {
                            errorFields = data.data.split(",");
                            $.each(errorFields, function (index, field) {
                                addError($("#item" + field));
                            });
                        }
                    }
                }
            });
        },

        deleteItem: function (e) {
            var self = this;

            $.ajax({
                url: "api/items/delete",
                data: {
                    _id: $(e.target).data('id')
                },
                success: function (data) {
                    if (data.success === true) {
                        self.reloadPopup(function (items) {
                            if (items.length > 0) {
                                $("select").selectpicker('val', items[0]._id);
                            } else {
                                $("select").trigger("change");
                            }
                        });
                    } else {
                        self.vent.trigger('Alert:Error', window.Translator.translate("items.deleteFailed"), self.el);
                    }
                }
            });
        }
    });
});