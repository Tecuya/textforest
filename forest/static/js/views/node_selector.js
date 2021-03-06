define(
    ['jquery',
        'underscore',
        'backbone',
        'js/models/node',
        'js/collections/nodes',
        'js/views/model_selector'],

    function($, _, Backbone, Node, Nodes, ModelSelector) {
        return ModelSelector.extend({

            initialize: function(options) {
                options.collection = new Nodes();
                ModelSelector.prototype.initialize.call(this, options);
            },

            select_model: function(node) {
                ModelSelector.prototype.select_model.call(this, node);
                this.$el.find(this.elements.input).val(node.get('name'));
            },

            perform_creation: function(inline_create_options) {
                this.forest_view.node_inline_create(inline_create_options);
            },

            prime_from_slug: function(slug) {
                var self = this;
                if (slug) {
                    var node = new Node({ slug: slug });
                    node.fetch({
                        success: function() {
                            self.select_model(node);
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
