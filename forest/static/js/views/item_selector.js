define(
    ['jquery',
        'underscore',
        'backbone',
        'js/models/item',
        'js/collections/items',
        'js/views/model_selector'],

    function($, _, Backbone, Item, Items, ModelSelector) {
        return ModelSelector.extend({

            initialize: function(options) {
                options.collection = new Items();
                ModelSelector.prototype.initialize.call(this, options);
            },

            select_model: function(item) {
                ModelSelector.prototype.select_model.call(this, item);
                // this.$el.find(this.elements.input).val(item.get('name')).hide();
            },

            perform_creation: function(inline_create_options) {
                this.forest_view.item_inline_create(inline_create_options);
            },

            prime_from_slug: function(slug) {
                var self = this;
                if (slug) {
                    var item = new Item({ slug: slug });
                    item.fetch({
                        success: function() {
                            self.select_model(item);
                        },
                        error: function(xhr, err) {
                            self.forest_view.add_error(err.responseText);
                        }
                    });
                }
            }
        });
    }
);
