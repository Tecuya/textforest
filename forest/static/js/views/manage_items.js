define(
    ['jquery',
        'underscore',
        'backbone',
        'js/collections/items',
        'tpl!templates/manage_items'
    ],
    function($, _, Backbone, Items, manageitemstpl) {
        return Backbone.View.extend({

            template: manageitemstpl,

            initialize: function(options) {
                this.manage_content_view = options.manage_content_view;
                this.forest_view = options.forest_view;

                this.items_collection = new Items();
            },

            render: function() {

                var self = this;
                this.items_collection.fetch(
                    {
                        success: function() {
                            self.$el.html(self.template({ items: self.items_collection }));
                            self.$el.find('table').DataTable();
                        },
                        error: function(xhr, err, ex) {
                            self.add_error('Items fetch failed: ' + err.responseText);
                        }
                    });
            }
        });
    });
