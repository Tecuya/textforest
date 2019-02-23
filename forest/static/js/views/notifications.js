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
                'click div#notification_clear_all': 'notification_clear_all'
            },

            initialize: function(options) {
                this.forest_view = options.forest_view;
                this.notifications_collection = options.notifications_collection;
            },

            render: function() {
                this.$el.html(this.template({ notifications_collection: this.notifications_collection }));
            },

            notification_clear: function(evt) {
                var self = this;
                this.notifications_collection
                    .findWhere({ id: $(evt.target).data('notification-id') })
                    .destroy({
                        success: function() {
                            self.render();
                            if (self.notifications_collection.models.length == 0) {
                                $('div#notifications').hide();
                            }
                            self.forest_view.statusbar_view.render();
                        }
                    });
            },

            notification_clear_all: function() {
                var self = this;

                _.each(
                    _.clone(this.forest_view.notifications_collection.models),
                    function(m) {
                        m.destroy({
                            success: function() {
                                self.render();

                                if (self.notifications_collection.models.length == 0) {
                                    $('div#notifications').hide();
                                }

                                self.forest_view.statusbar_view.render();
                            }
                        });
                    });
            }

        });
    }
);
