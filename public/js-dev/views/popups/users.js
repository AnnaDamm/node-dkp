/*global define, window */

"use strict";

define('views/popups/users', [
    'jquery',
    'underscore',
    'backbone',
    'lib/bootstrap-editable',
    'collections/users',
    'text!templates/popups/users.ejs',
    'text!templates/popups/users/tableDefinition.ejs',
    'text!templates/popups/users/userRow.ejs'
], function ($, _, backbone, editable, UsersCollection, membersPopup, tableDefinition, memberRow) {

    function addError($input) {
        $input.parents('.form-group')
            .removeClass('has-success')
            .addClass('has-error')
            .addClass('has-feedback');
    }

    return backbone.View.extend({
        className: "dkp_modal modal_members modal fade",
        attributes: {
            "tabindex": -1
        },
        events: {
        },
        initialize: function (options) {
            this.vent = options.vent;

            this.template = _.template(membersPopup);
            this.tableDefinitionTemplate = _.template(tableDefinition);
            this.memberRowTemplate = _.template(memberRow);
        },

        render: function () {
            var self = this;

            this.usersCollection = new UsersCollection();

            this.usersCollection.fetch(function (error, users) {
                if (error) {
                    self.vent.trigger('Router:Back');
                    self.vent.trigger('Alert:Error', error);
                    return;
                }
                var $template = $(self.template()),
                    $notBannedTable = $(self.tableDefinitionTemplate()),
                    $bannedTable    = $notBannedTable.clone(),
                    $allTable       = $notBannedTable.clone(),
                    $notBannedBody  = $notBannedTable.find('tbody'),
                    $bannedBody     = $bannedTable.find('tbody'),
                    $allBody        = $allTable.find('tbody');

                $("#notBannedTab", $template).append($notBannedTable);
                $("#bannedTab", $template).append($bannedTable);
                $("#allTab", $template).append($allTable);


                addMembers();

                function addMembers() {
                    _.each(users.models, function (user) {
                        var $memberRow = $(self.memberRowTemplate({
                            user: user.attributes
                        }));
                        if (user.attributes.isBanned) {
                            $bannedBody.append($memberRow.clone());
                        } else {
                            $notBannedBody.append($memberRow.clone());
                        }
                        $allBody.append($memberRow);
                    });

                    $(".editable", $template).editable({
                        url: "api/user/change",
                        success: function (response, newValue) {
                            if (!response) {
                                return "Connection error";
                            }
                            if (!response.success) {
                                return response.data;
                            }
                            var userId = $(this).parents('.userRow').data("user-id"),
                                userModel = users.get(userId);
                            $("[data-pk='" + response.pk + "'][data-name='" + response.name + "']", $template).not($(this)).editable('setValue', newValue);

                            switch (response.name) {
                                case "isbanned":
                                    $("[data-pk='" + response.pk + "']", newValue == "1" ? $notBannedTable : $bannedTable).parents("tr").appendTo(newValue == "1" ? $bannedTable : $notBannedTable);
                                    userModel.set('isBanned', newValue == "1");
                                    break;
                                case "isadmin":
                                    userModel.set('isBanned', newValue == "1");
                                    break;
                                case "login":
                                    userModel.set('login', newValue);
                                    break;
                                case "email":
                                    userModel.set('email', newValue);
                                    break;
                                case "charname":
                                    var chars = userModel.get("characters");
                                    chars[response.pk.split("-")[1]] = {
                                        name: newValue,
                                        smallName: newValue.toLowerCase()
                                    };
                                    userModel.set('characters', chars);

                                    $(".editable", $template).editable("destroy");
                                    $allBody.add($bannedBody).add($notBannedBody).empty();
                                    addMembers();
                                    break;
                            }
                        }
                    });
                }

                $(self.el).html($template);
                $("#popup").html(self.el);
                $('.modal_members').modal('show');

            });
        }
    });
});