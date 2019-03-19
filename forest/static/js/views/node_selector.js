define(
    ['jquery',
        'underscore',
        'backbone',
        'put_cursor_at_end',
        'js/collections/nodes',
        'js/views/node_list',
        'js/util/fetch_completions',
        'tpl!templates/node_selector'],

    function($, _, Backbone, put_cursor_at_end, Nodes, NodeList, fetch_completions, nodeselectortpl) {
        return Backbone.View.extend({

            elements: {
                'input': 'input.node_selector_input',
                'input_div': 'div.node_selector_input',

                'selection_div': 'div.node_selector_selection',
                'selection_string_div': 'div.node_selector_selection_string',
                'selection_change_div': 'div.node_selector_selection_change',

                'node_selector_list': 'div.node_selector_list'
            },

            events: {
                'keyup input.node_selector_input': 'keyup_input_node',
                'click div.node_selector_selection_string': 'click_change_selection'
            },

            template: nodeselectortpl,

            initialize: function(options) {
                var self = this;
                this.forest_view = options.forest_view;
                this.nodes_collection = new Nodes();
                this.node_list_view = new NodeList({
                    nodes_collection: this.nodes_collection,
                    on_click_list_item: function(slug) { self.click_list_item(slug); }
                });
            },

            render: function() {
                this.$el.html(this.template({}));
                this.node_list_view.setElement(this.$el.find(this.elements.node_selector_list));
            },

            keyup_input_node: function() {
                var self = this;

                var input_contents = this.$el.find(self.elements.input).val();
                if (input_contents.length < 2) {
                    return;
                }

                window.setTimeout(
                    function() {
                        fetch_completions(
                            self.lastfetch,
                            function() {
                                var input_contents = self.$el.find(self.elements.input).val();
                                self.lastfetch = new Date().getTime();
                                self.nodes_collection.set_search_text(input_contents);

                                if (input_contents[0] == '/') {
                                    return;
                                }

                                self.nodes_collection.fetch({
                                    success: function() {
                                        // they already made a selection so dont interrupt
                                        if (self.$el.find(self.elements.selection_div).is(':visible')) {
                                            return;
                                        }
                                        self.node_list_view.render();
                                    },
                                    error: function(col, err) { self.forest_view.add_error(err.responseText); }
                                });
                            });
                    }, 10);
            },

            click_list_item: function(slug) {
                this.select_node(this.nodes_collection.findWhere({ 'slug': slug }));
            },

            select_node: function(node) {
                this.selected_node = node;

                this.$el.find(this.elements.input).val(node.get('name')).hide();
                this.$el.find(this.elements.node_selector_list).hide();
                this.$el.find(this.elements.selection_string_div).html(node.to_string());
                this.$el.find(this.elements.selection_div).show();
            },

            click_change_selection: function() {

                this.$el.find(this.elements.input).show().putCursorAtEnd().focus();
                this.keyup_input_node();

                this.$el.find(this.elements.node_selector_list).show();
                this.$el.find(this.elements.selection_div).hide();
            }
        });
    }
);
