/*global define, window */

"use strict";

define('views/popups/raid/commentsTab', [
    'jquery',
    'underscore',
    'backbone',
    'collections/comments',
    'text!templates/popups/raid/commentsTab.ejs',
    'text!templates/popups/raid/commentsTab/comment.ejs'
], function ($, _, backbone, CommentsCollection,
             template, commentTemplate
    ) {


    return backbone.View.extend({
        events: {
            'click .member': 'memberLinkClicked',
            'submit #newCommentForm': 'submitComment'
        },
        initialize: function (options) {
            this.vent = options.vent;

            this.template           = _.template(template);
            this.commentTemplate    = _.template(commentTemplate);

            this.comments = new CommentsCollection();
        },

        render: function (raid, comments) {
            var self       = this;

            self.raid  = raid || self.raid;

            function showComments(comments) {
                var $commentList = $(self.el).find("#comments");
                $commentList.empty();

                _.each(comments, function (comment) {
                    $commentList.append(self.commentTemplate({
                        comment: comment
                    }));
                });

                setTimeout(function () {
                    self.comments.fetch(self.raid.id, function (error, comments) {
                        if (error) {
                            return self.vent.trigger("Alert:Error", error, "#commentsTab");
                        }
                        showComments(comments);
                    });
                }, 30000);
            }

            $(self.el).html(self.template());

            if (comments && comments.length > 0) {
                return showComments(comments);
            }

            self.comments.fetch(self.raid.id, function (error, comments) {
                if (error) {
                    return self.vent.trigger("Alert:Error", error, "#commentsTab");
                }
                showComments(comments);
            });
        },

        memberLinkClicked: function () {
            var $el = $(".modal_raid");
            $el.off('hidden.bs.modal')
                .on('hidden.bs.modal', function () {
                    $(this).off('hidden.bs.modal');
                    $el.remove();
                })
                .modal('hide');
        },

        submitComment: function (e) {
            var self     = this,
                $form    = $(e.target).closest('form'),
                $comment = $form.find('.comment');
            e.preventDefault();

            $.ajax({
                url: "api/comments/add",
                data: {
                    raidId: self.raid.id,
                    comment: $comment.val()
                },
                success: function (data) {
                    if (data.success) {
                        self.render(null, data.comments);
                    } else {
                        self.vent.trigger("Alert:Error", data.data, "#commentsTab");
                    }
                },
                error: function (xhr) {
                    self.vent.trigger("Alert:Error", xhr.statusText, "#commentsTab");
                }
            });
        }
    });
});