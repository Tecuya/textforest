define(
    ['jquery',
        'underscore',
        'backbone',
        'tpl!templates/inventory'
    ],
    function($, _, Backbone, inventorytpl) {
        return Backbone.View.extend({

            template: inventorytpl,

            events: {
                'click span.inventory_drop': 'inventory_drop',
                'click div#inventory_clear_all': 'inventory_drop_all',
                'click div.drawer_close_button': 'close_inventory'
            },

            initialize: function(options) {
                this.forest_view = options.forest_view;
                this.user = options.user;
            },

            render: function() {
                this.$el.html(this.template({ inventory: this.user.get('items') }));
            },

            close_inventory: function(evt) {
                this.$el.hide();
            },

            inventory_drop: function(evt) {
                var self = this;

                var drop_slug = $(evt.target).data('drop-item-id');

                this.user.set(
                    'items',
                    _.filter(
                        this.user.get('items'),
                        function(item) {
                            return (item.get('slug') != drop_slug);
                        }
                    )
                );

                this.user.save(
                    {},
                    {
                        success: function() {
                            self.forest_view.refresh_current_node();
                        },
                        error: function(xhr, err) {
                            self.forest_view.add_error(err);
                        }
                    });
            },

            inventory_drop_all: function(evt) {
                var self = this;
                this.user.set('items', []);
                this.user.save(
                    {},
                    {
                        success: function() {
                            self.forest_view.refresh_current_node();
                        },
                        error: function(xhr, err) {
                            self.forest_view.add_error(err);
                        }
                    });
            }
        });
    });
