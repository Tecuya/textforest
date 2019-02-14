define(
    ['jquery',
        'underscore',
        'backbone',
        'showdown',
        'models/node',
        'views/relations',
        'tpl!templates/node'],
    function($, _, Backbone, showdown, Node, Relations, nodetpl) {
        return Backbone.View.extend({

            template: nodetpl,

            elements: {
                'delete_confirm_div': 'div.delete_confirm'
            },

            events: {
                'click div.actionlink': 'actionlink'
            },

            initialize: function(options) {
                this.node = options.node;
                this.forest_view = options.forest_view;
            },

            render: function(counter) {
                var converter = new showdown.Converter();
                this.node.set('text_presentation', converter.makeHtml(this.node.get('text')));
                this.$el.html(this.template({ node: this.node, user: this.forest_view.user }));
            },

            actionlink: function(evt) {
                var action = $(evt.target).data('action');
                if (action == 'edit') {
                    this.forest_view.log_command('[Edit link clicked]');
                    this.forest_view.node_edit(this.node.get('slug'));

                } else if (action == 'delete') {
                    this.$el.find(this.elements.delete_confirm_div).show();
                    this.forest_view.scroll_bottom();

                } else if (action == 'delete-no') {
                    this.$el.find(this.elements.delete_confirm_div).hide();

                } else if (action == 'delete-yes') {
                    this.forest_view.log_command('[Post deleted]');
                    this.forest_view.delete_node();
                }
            }

        });
    }
);
