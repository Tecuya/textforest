define(
    ['jquery',
        'underscore',
        'backbone',
        'put_cursor_at_end',
        'util/fetch_completions',
        'collections/items',
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
                this.items = new Items();
            },

            render: function() {

                var focused_tabindex = this.$el.find('div.item_list_item:focus').attr('tabindex');

                this.$el.html(this.template({ items: this.items }));

                if (focused_tabindex) {
                    this.$el.find('div.item_list_item[tabindex=' + focused_tabindex + ']').focus();
                }
            },

            update_text: function(text) {
                if (text.length == 0) {
                    this.render();
                    return;
                }

                if (text.length < 2) {
                    return;
                }

                var self = this;
                window.setTimeout(
                    function() {
                        fetch_completions(
                            self.lastfetch,
                            function() {
                                self.lastfetch = new Date().getTime();
                                self.items.text = text;
                                self.items.fetch({
                                    error: function() { self.$el.html('Server error...'); },
                                    success: function() { self.render(); }
                                });
                            }
                        );
                    }, 10);
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
                this.choices_view.create_branch_existing_item_select(this.items.findWhere({ slug: $(evt.target).data('slug') }));
            }
        });
    }
);
