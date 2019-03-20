define(
    ['jquery',
        'underscore',
        'backbone',
        'tpl!templates/notifications'
    ],
    function($, _, Backbone, notificationtpl) {
        return Backbone.View.extend({

            template: notificationtpl,

            events: {
                'click span.notification_clear': 'notification_clear',
                'click div#notification_clear_all': 'notification_clear_all',
                'click div.drawer_close_button': 'close_notifications',
                'click tr': 'click_view_notification'

            },

            initialize: function(options) {
                this.forest_view = options.forest_view;
                this.notifications_collection = options.notifications_collection;
            },

            render: function() {
                this.$el.html(this.template({ notifications_collection: this.notifications_collection }));
                this.$el.find('table').DataTable();
            },

            close_notifications: function(evt) {
                this.$el.hide();
            },

            click_view_notification: function(evt) {
                var node_slug = $(evt.target).closest('tr').data('node-slug');
                this.forest_view.node_view(node_slug);
            },

            notification_clear: function(evt) {

                evt.stopPropagation();

                if (!$(evt.target).hasClass('red')) {
                    $(evt.target).addClass('red');
                    return;
                }

                var self = this;
                this.notifications_collection
                    .findWhere({ id: $(evt.target).closest('tr').data('notification-id') })
                    .destroy({
                            success: function() {
                                self.render();
                                self.forest_view.statusbar_view.render();
                            }
                    });

            },

            notification_clear_all: function(evt) {

                if (!$(evt.target).hasClass('red')) {
                    $(evt.target).addClass('red');
                    return;
                }

                var self = this;

                _.each(
                    _.clone(this.forest_view.notifications_collection.models),
                    function(m) {
                        m.destroy({
                            success: function() {
                                self.render();
                                self.forest_view.statusbar_view.render();
                            }
                        });
                    });
            }

        });
    }
);
