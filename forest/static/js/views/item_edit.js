define(
    ['jquery',
        'underscore',
        'backbone',
        'showdown',
        'put_cursor_at_end',
        'js/models/item',
        'tpl!templates/item_edit'],
    function($, _, Backbone, showdown, put_cursor_at_end, Item, itemedittpl) {

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
                'click button#item_edit_cancel': 'cancel'
            },

            template: itemedittpl,

            initialize: function(options) {
                this.forest_view = options.forest_view;
            },

            set_item: function(item) {
                this.item = item;
            },

            render: function() {
                this.$el.html(this.template({ item: this.item }));

                this.$el.find(this.elements.name_input).val(this.item.get('name')).focus();

                if (this.item.get('description_node')) {

                    // slug is a stand-in until it looks up the real node
                    this.$el.find(this.elements.dest_widget).html(this.item.get('description_node'));

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

                // TODO description node here

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
