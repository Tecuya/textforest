define(
    ['jquery',
        'underscore',
        'backbone',
        'models/node',
        'views/relations',
        'tpl!templates/node'],
    function($, _, Backbone, Node, Relations, nodetpl) {
        return Backbone.View.extend({

            template: nodetpl,

            initialize: function(options) {
                this.node = options.node;
                this.forest_view = options.forest_view;
            },

            render: function(counter) {
                this.divid = 'node-' + counter;
                this.$el.append(this.template({ node: this.node, divid: this.divid }));
            }

        });
    }
);
