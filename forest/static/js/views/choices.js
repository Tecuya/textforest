define(
    ['jquery',
        'underscore',
        'backbone',
        'put_cursor_at_end',
        'js/views/model_selector_list',
        'js/views/item_list',
        'tpl!templates/choices'],
    function($, _, Backbone, put_cursor_at_end, ModelList, ItemList, relationslisttpl) {
        return Backbone.View.extend({

            template: relationslisttpl,

            events: {
                'keyup .list_item': 'keypress_list_item',
                'click .list_item': 'click_list_item',

                'click .voteup': 'vote_up',
                'click .votedown': 'vote_down'
            },

            initialize: function(options) {
                var self = this;

                this.forest_view = options.forest_view;
                this.relations_collection = options.relations_collection;
            },

            render: function() {

                // we will restore the users focused tabindex after rendering
                var focused_tabindex = this.$el.find('div.list_item:focus').attr('tabindex');

                this.$el.html(
                    this.template(
                        {
                            prompt: this.forest_view.prompt_contents(),
                            node: this.forest_view.current_node,
                            relations: this.relations_collection,
                            user: this.forest_view.user
                        }
                    )
                );

                if (focused_tabindex) {
                    this.$el.find('div.list_item[tabindex=' + focused_tabindex + ']').focus();
                }
            },

            keypress_list_item: function(evt) {
                var target = $(evt.target);

                var tabindex = parseInt(target.attr('tabindex'));

                if (evt.which == 38) { // up arrow

                    // if we are at the top of the list return to the prompt
                    if (tabindex == 0) {
                        $('input#prompt').focus().putCursorAtEnd();

                    } else {
                        this.$el.find('div[tabindex=' + (tabindex - 1) + ']').focus();
                    }

                } else if (evt.which == 40) { // down arrow
                    this.$el.find('div[tabindex=' + (tabindex + 1) + ']').focus();

                } else if (evt.which == 13) { // enter
                    this.click_list_item(evt);
                }
            },

            click_list_item: function(evt) {

                var clicked_item = $(evt.target).closest('.list_item');
                var clicked_item_id = clicked_item.attr('id');

                if ($(evt.target).hasClass('delete_list_item')) { // little delete link

                    if (!$(evt.target).hasClass('red')) {
                        $(evt.target).addClass('red');
                    } else {
                        this.forest_view.delete_relation(clicked_item.data('relation-slug'));
                    }

                } else if ($(evt.target).hasClass('edit_list_item')) { // little delete link
                    this.forest_view.edit_relation(clicked_item.data('relation-slug'));

                } else if (clicked_item_id == 'create_relation') {
                    this.forest_view.relation_inline_create();

                } else {

                    this.forest_view.go_to_relation(
                        clicked_item.data('relation-slug'),
                        clicked_item.hasClass('list_item_backward'));
                }

                evt.stopPropagation();
            },

            vote_up: function(evt) {
                evt.stopPropagation();
                var slug = $(evt.target).data('slug');
                this.forest_view.vote(slug, 'up');
            },

            vote_down: function(evt) {
                evt.stopPropagation();
                var slug = $(evt.target).data('slug');
                this.forest_view.vote(slug, 'down');
            }
        });
    }
);
