/*global define, window, Roles:true, confirm */

"use strict";

define('views/popups/roles', [
    'jquery',
    'underscore',
    'backbone',
    'jqueryui',
    'text!templates/popups/roles.ejs',
    'text!templates/popups/roles/roleItem.ejs',
    'text!templates/popups/roles/deleteItem.ejs'
], function ($, _, backbone, jqueryui, rolesPopup, roleItem, deleteItem) {
    return backbone.View.extend({
        className: "dkp_modal modal_roles modal fade",
        attributes: {
            "tabindex": -1
        },
        events: {
            "submit #roleform":  "save",
            "click .addRole":    "addRole",
            "click .removeRole": "removeRole"
        },
        initialize: function (options) {
            this.vent = options.vent;

            this.template   = _.template(rolesPopup);
            this.roleItem   = _.template(roleItem);
            this.deleteItem = _.template(deleteItem);

            this.newCounter = 0;
            this.rank       = 0;
        },

        appendRank: function (id, name, list) {
            $(list).append(this.roleItem({
                id:   id,
                name: name,
                rank: this.rank
            }));
            this.rank = this.rank + 1;
        },

        render: function (isReload) {
            var self = this,
                $el  = $(self.el),
                $roleList;

            isReload = isReload || false;

            $el.html(self.template());
            $roleList = $el.find('#roleList');

            _.each(Roles, function (name, id) {
                self.appendRank(id, name, $roleList);
            });

            $roleList.sortable({
                handle: ".glyphicon-move",
                update: function () {
                    $roleList.find('li').each(function (index, element) {
                        $(element).find(".roleRank").val(index);
                    });
                }
            });


            if (!isReload) {
                $("#body").append(self.el);
                $el.modal('show');

                $el.on('hidden.bs.modal', function (e) {
                    $el.off('hidden.bs.modal');
                    $el.remove();
                });
            }
        },

        addRole: function (e) {
            this.appendRank("new-" + this.newCounter,  "", $(this.el).find('#roleList'));
            this.newCounter = this.newCounter + 1;
        },

        removeRole: function (e) {
            var $button = $(e.target).closest('.removeRole'),
                roleId  = $button.data('id');

            if (roleId.indexOf("new") === 0) {
                $button.parents('li').remove();
                return;
            }

            if (confirm(Translator.translate("roles.confirmDelete", Roles[roleId]))) {
                $button.parents('li').remove();
                $("#roleform").append(this.deleteItem({
                    id: roleId
                }));
            }
        },

        save: function (e) {
            var self = this;
            e.preventDefault();

            $.ajax({
                url: "api/roles/update",
                data: $("#roleform").serialize(),
                success: function (data) {
                    if (data.success) {
                        Roles = data.roles;
                        self.render(true);
                        self.vent.trigger("Alert:Success", window.Translator.translate("roles.savedSuccessful"), self.el);
                    } else {
                        self.vent.trigger("Alert:Error", data.data, self.el);
                    }
                },
                error: function () {
                    self.vent.trigger("Alert:Error", window.Translator.translate("roles.saveFailed"), self.el);
                }
            });
        }
    });
});