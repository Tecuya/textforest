define(
    ['jquery',
        'underscore',
        'backbone',
        'put_cursor_at_end',
        'util/fetch_completions',
        'collections/nodes',
        'tpl!templates/node_list'],
    function($, _, Backbone, put_cursor_at_end, fetch_completions, Nodes, nodelisttpl) {

        return Backbone.View.extend({

            template: nodelisttpl,

            events: {
                'keyup div.node_list_item': 'keypress_list',
                'click div.node_list_item': 'click_list'
            },

            initialize: function(options) {
                this.forest_view = options.forest_view;
                this.nodes = new Nodes();
            },

            render: function() {
                this.$el.html(this.template({ nodes: this.nodes }));
            },

            update_text: function(text) {
                if (text.length == 0) {
                    this.render();
                    return;
                }

                if (text.length < 3) {
                    return;
                }

                var self = this;
                window.setTimeout(
                    function() {
                        fetch_completions(
                            self.lastfetch,
                            function() {
                                self.lastfetch = new Date().getTime();
                                self.nodes.text = text;
                                self.nodes.fetch({
                                    error: function() { self.$el.html('Server error...'); },
                                    success: function() { self.render(); }
                                });
                            }
                        );
                    }, 10);
            },

            keypress_list: function(evt) {
                var target = $(evt.target);
                var tabindex = target.attr('tabindex');

                if (evt.which == 38) { // up arrow
                    if (tabindex == 0) {
                        $('input#relation_link_dest').focus();
                    } else {
                        $('div.node_list_item[tabindex=' + (tabindex - 1) + ']').focus();
                    }

                } else if (evt.which == 40) { // down arrow
                    $('div.node_list_item[tabindex=' + (tabindex + 1) + ']').focus();

                } else if (evt.which == 13) {
                    this.click_list(evt);
                }
            },

            click_list: function(evt) {
                this.forest_view.create_relation_to_node(this.nodes.findWhere({ slug: $(evt.target).data('slug') }));
            }

        });

    });
