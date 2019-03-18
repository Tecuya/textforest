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

            events: {
                'click tr': 'click_view_item',
                'click span#manage_view_item': 'click_view_item',
                'click span#manage_edit_item': 'click_edit_item',
                'click span#manage_delete_item': 'click_delete_item'
            },

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
            },

            click_view_item: function(evt) {
                evt.stopPropagation();

            },

            click_edit_item: function(evt) {
                evt.stopPropagation();

            },

            click_delete_item: function(evt) {
                evt.stopPropagation();

                var self = this;

                var slug = $(evt.target).closest('tr').data('slug').toString();

                if (!$(evt.target).hasClass('red')) {
                    $(evt.target).addClass('red');
                } else {
                    var item = this.items_collection.findWhere({ slug: slug });
                    item.destroy({
                        wait: true,
                        success: function() {
                            self.items_collection.remove(item);
                            $(evt.target).closest('tr').hide();
                        },
                        error: function(node, resp) {
                            self.forest_view.add_error(resp.responseText);
                        }
                    });
                }
            }
        });
    });
