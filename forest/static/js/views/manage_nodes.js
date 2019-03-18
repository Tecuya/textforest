define(
    ['jquery',
        'underscore',
        'backbone',
        'datatables',
        'js/models/node',
        'js/collections/nodes',
        'tpl!templates/manage_nodes',
    ],
    function($, _, Backbone, datatables, Node, Nodes, managenodestpl) {
        return Backbone.View.extend({

            template: managenodestpl,

            events: {
                'click tr': 'click_view_node',
                'click span#manage_view_node': 'click_view_node',
                'click span#manage_edit_node': 'click_edit_node',
                'click span#manage_delete_node': 'click_delete_node'
            },

            initialize: function(options) {
                this.manage_content_view = options.manage_content_view;
                this.forest_view = options.forest_view;

                this.nodes_collection = new Nodes();
            },

            render: function() {

                var self = this;
                this.nodes_collection.fetch(
                    {
                        success: function() {
                            self.$el.html(self.template({ nodes: self.nodes_collection }));
                            self.$el.find('table').DataTable();
                        },
                        error: function(xhr, err, ex) {
                            self.add_error('Node fetch failed: ' + err.responseText);
                        }
                    });
            },

            click_view_node: function(evt) {
                evt.stopPropagation();

                var slug = $(evt.target).closest('tr').data('slug').toString();
                Backbone.history.navigate('/f/' + slug, true);
            },

            click_edit_node: function(evt) {
                evt.stopPropagation();

                var slug = $(evt.target).closest('tr').data('slug').toString();

                var node = this.nodes_collection.findWhere({ slug: slug });

                this.forest_view.node_edit(node);
            },

            click_delete_node: function(evt) {
                evt.stopPropagation();

                var self = this;

                var slug = $(evt.target).closest('tr').data('slug').toString();

                if (!$(evt.target).hasClass('red')) {
                    $(evt.target).addClass('red');
                } else {

                    var node = this.nodes_collection.findWhere({ slug: slug });
                    node.destroy({
                        wait: true,
                        success: function() {
                            self.nodes_collection.remove(node);
                            $(evt.target).closest('tr').hide();
                        },
                        error: function(xhr, resp) {
                            self.forest_view.add_error(resp.responseText);
                        }
                    });
                }
            }
        });
    });
