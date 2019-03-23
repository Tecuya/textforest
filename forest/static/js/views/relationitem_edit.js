define(
    ['jquery',
        'underscore',
        'backbone',
        'js/views/item_selector',
        'tpl!templates/relationitem_edit'],
    function($, _, Backbone, ItemSelector, relationitemedittpl) {

        return Backbone.View.extend({

            events: {
                'click div.relationitem_remove': 'remove_item'
            },

            template: relationitemedittpl,

            initialize: function(options) {
                this.forest_view = options.forest_view;
                this.relation_edit_view = options.relation_edit_view;
                this.item_selector = new ItemSelector({ forest_view: this.forest_view });
                this.relationitem = options.relationitem;
            },

            render: function(mode) {
                this.$el.html(this.template({}));

                this.item_selector.setElement(this.$el.find('div.relationitem_item_selector'));
                this.item_selector.inline_create_options = {
                    title: 'Create Item for Choice: "' + this.relation_edit_view.relation.get('text') + '"',
                    return_to_divmodal: this.forest_view.elements.divmodal_relation_edit
                };
                this.item_selector.render();

                if (mode == 'edit' && this.relationitem) {
                    this.$el.find('select#relationitem_action_select').val(this.relationitem.get('interaction'));
                    this.$el.find('input#relationitem_qty_input').val(this.relationitem.get('quantity'));
                    this.$el.find('input#relationitem_hide').prop('checked', this.relationitem.get('hide'));
                    this.item_selector.select_model(this.relationitem.get('item'));
                } else {
                    // sane defaults
                    this.$el.find('input#relationitem_qty_input').val('1');
                }

            },

            remove_item: function() {
                this.$el.remove();
            }
        });
    });
