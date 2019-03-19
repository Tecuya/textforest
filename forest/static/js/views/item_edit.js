define(
    ['jquery',
        'underscore',
        'backbone',
        'showdown',
        'put_cursor_at_end',
        'js/models/item',
        'js/models/node',
        'js/collections/nodes',
        'js/views/node_selector',
        'tpl!templates/item_edit'],
    function($, _, Backbone, showdown, put_cursor_at_end, Item, Node, Nodes, NodeSelector, itemedittpl) {

        return Backbone.View.extend({

            elements: {
                'preview': 'div#editpreview',
                'name_input': 'input#item_name_input',
                'dest_widget': 'div#item_dest_widget',
                'max_quantity_input': 'input#item_max_quantity_input',
                'droppable_checkbox': 'input#item_droppable_checkbox',
                'public_can_give_checkbox': 'input#item_public_can_give_checkbox'
            },

            events: {
                'click button#item_edit_save': 'save',
                'click button#item_edit_preview': 'preview',
                'click button#item_edit_cancel': 'cancel',
            },

            template: itemedittpl,

            initialize: function(options) {
                this.forest_view = options.forest_view;
                this.nodes_collection = new Nodes();
                this.node_selector = new NodeSelector({ forest_view: this.forest_view });
            },

            set_item: function(item) {
                this.item = item;
            },

            render: function() {
                var self = this;

                this.$el.html(this.template({ item: this.item }));

                this.$el.find(this.elements.name_input).val(this.item.get('name')).focus();

                this.node_selector.setElement(this.$el.find('div#item_dest_widget'));
                this.node_selector.render();

                var slug = this.item.get('description_node');
                if (slug) {
                    var node = new Node({ slug: slug });
                    node.fetch({
                        success: function() {
                            self.node_selector.select_node(node);
                        },
                        error: function(xhr, err) {
                            self.forest_view.add_error(err.responseText);
                        }
                    });
                }

                this.$el.find(this.elements.max_quantity_input).val(this.item.get('max_quantity'));
                this.$el.find(this.elements.droppable_checkbox).prop('checked', this.item.get('droppable'));
                this.$el.find(this.elements.public_can_give_checkbox).prop('checked', this.item.get('public_can_give'));
            },

            cancel: function() {
                this.forest_view.hide_divmodal();
            },

            save: function() {
                this.item.set('name', this.$el.find(this.elements.name_input).val());

                if (this.node_selector.selected_node) {
                    this.item.set('description_node', this.node_selector.selected_node_slug);
                }

                this.item.set('max_quantity', this.$el.find(this.elements.max_quantity_input).val());
                this.item.set('droppable', this.$el.find(this.elements.droppable_checkbox).is(':checked'));
                this.item.set('public_can_give', this.$el.find(this.elements.public_can_give_checkbox).is(':checked'));

                var self = this;
                this.item.save(
                    {},
                    {
                        success: function() {
                            self.forest_view.manage_content_view.manage_items_view.render();
                            self.forest_view.hide_divmodal();
                        },
                        error: function(xhr, resp) {
                            self.forest_view.add_error(resp.responseText);
                        }
                    });
            }
        });
    }
);
