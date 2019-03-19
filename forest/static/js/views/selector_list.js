define(
    ['jquery',
        'underscore',
        'backbone',
        'tpl!templates/list_selector_list'],
    function($, _, Backbone, nodelisttpl) {

        return Backbone.View.extend({

            template: nodelisttpl,

            events: {
                'click div.list_item': 'click_list'
            },

            initialize: function(options) {
                this.nodes_collection = options.nodes_collection;
                this.on_click_list_item = options.on_click_list_item;
            },

            render: function() {
                if (!this.nodes_collection) {
                    console.log('Deprecated call fixme');
                    return;
                }
                this.$el.html(this.template({ nodes: this.nodes_collection }));
            },

            click_list: function(evt) {
                this.on_click_list_item($(evt.target).data('slug'));
            }

        });

    });
