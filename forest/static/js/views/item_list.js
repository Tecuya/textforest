define(
    ['jquery',
        'underscore',
        'backbone',
        'put_cursor_at_end',
        'js/util/fetch_completions',
        'js/collections/items',
        'tpl!templates/item_list'],
    function($, _, Backbone, put_cursor_at_end, fetch_completions, Items, itemlisttpl) {

        return Backbone.View.extend({

            template: itemlisttpl,

            events: {
                'keyup div.item_list_item': 'keypress_list',
                'click div.item_list_item': 'click_list'
            },

            initialize: function(options) {
                this.choices_view = options.choices_view;
                this.forest_view = options.forest_view;
                this.on_select = options.on_select;
                this.items = new Items();
            },

            render: function() {

                var focused_tabindex = this.$el.find('div.item_list_item:focus').attr('tabindex');

                this.$el.html(this.template({ items: this.items }));

                if (focused_tabindex) {
                    this.$el.find('div.item_list_item[tabindex=' + focused_tabindex + ']').focus();
                }
            },

            keypress_list: function(evt) {
                var target = $(evt.target);
                var tabindex = parseInt(target.attr('tabindex'));

                if (evt.which == 38) { // up arrow
                    if (tabindex == 0) {
                        $('input#relation_create_dest').focus();
                    } else {
                        $('div.item_list_item[tabindex=' + (tabindex - 1) + ']').focus();
                    }

                } else if (evt.which == 40) { // down arrow
                    var tryitem = $('div.item_list_item[tabindex=' + (tabindex + 1) + ']');

                    if (tryitem.is(':visible')) {
                        tryitem.focus();
                    } else {
                        this.choices_view.$el.find('input#relation_create_require_item').focus();
                    }

                } else if (evt.which == 13) {
                    this.click_list(evt);
                }

                evt.stopPropagation();
            },

            click_list: function(evt) {
                var item = this.items.findWhere({ slug: $(evt.target).data('slug') });
                this.on_select(item);
                evt.stopPropagation();
            }
        });
    }
);
