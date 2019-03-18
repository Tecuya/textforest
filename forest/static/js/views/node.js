define(
    ['jquery',
        'underscore',
        'backbone',
        'showdown',
        'js/models/node',
        'tpl!templates/node'],
    function($, _, Backbone, showdown, Node, nodetpl) {
        return Backbone.View.extend({

            template: nodetpl,

            elements: {
                'delete_confirm_div': 'div.delete_confirm'
            },

            events: {
                'click div.actionlink': 'actionlink',
                'click span#star_full': 'click_subscribe',
                'click span#star_empty': 'click_subscribe'
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
                    this.forest_view.log_command('[Edit ' + this.forest_view.current_node.get('slug') + ']');
                    this.forest_view.node_edit(this.node.get('slug'));

                } else if (action == 'delete') {
                    this.$el.find(this.elements.delete_confirm_div).show();
                    this.forest_view.scroll_bottom();

                } else if (action == 'delete-no') {
                    this.$el.find(this.elements.delete_confirm_div).hide();

                } else if (action == 'delete-yes') {
                    this.forest_view.log_command('[Delete ' + this.forest_view.current_node.get('slug') + ']');
                    this.forest_view.delete_node();
                }
            },

            click_subscribe: function(evt) {
                var subscribe = $(evt.target).attr('id') == 'star_empty';
                if (!this.forest_view.user.get('username')) {
                    this.forest_view.add_error('You must be logged in to subscribe');
                    return;
                }
                var self = this;
                this.forest_view.current_node.subscribe({
                    subscribe: subscribe,
                    success: function() {
                        if (subscribe) {
                            self.$el.find('span#star_empty').hide();
                            self.$el.find('span#star_full').show();
                        } else {
                            self.$el.find('span#star_empty').show();
                            self.$el.find('span#star_full').hide();
                        }
                    },
                    error: function(errText) {
                        self.forest_view.add_error('Failed to change subscription setting: ' + errText);
                    }
                });
            }
        });
    }
);
