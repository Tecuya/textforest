define(
    ['jquery',
        'underscore',
        'backbone',
        'put_cursor_at_end',
        'views/node_list',
        'tpl!templates/relations_list'],
    function($, _, Backbone, put_cursor_at_end, NodeList, relationslisttpl) {
        return Backbone.View.extend({

            template: relationslisttpl,

            events: {
                'click .list_item': 'click_relation',
                'keyup .list_item': 'keypress_relation',
                'keyup input#relation_link_dest': 'keypress_destination',
                'click .voteup': 'vote_up',
                'click .votedown': 'vote_down'
            },

            initialize: function(options) {
                this.forest_view = options.forest_view;
                this.node_list_view = new NodeList({ forest_view: this.forest_view });
            },

            render: function(relations_collection) {
                // we will restore the users focused tabindex after rendering
                var focused_tabindex = $('div.list_item:focus').attr('tabindex');

                this.$el.html(this.template({ relations: relations_collection, user: this.forest_view.user }));

                this.node_list_view.setElement('div#existing_list');
                this.node_list_view.render();

                if (focused_tabindex) {
                    $('div.list_item[tabindex=' + focused_tabindex + ']').focus();
                }
            },

            keypress_relation: function(evt) {
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
                    this.click_relation(evt);
                }
            },

            click_relation: function(evt) {

                var clicked_item = $(evt.target).closest('.list_item');
                var clicked_item_id = clicked_item.attr('id');

                if ($(evt.target).hasClass('delete_relation')) {
                    this.forest_view.delete_relation(clicked_item.data('relation-slug'));

                } else if (clicked_item_id == 'create_relation') {
                    this.forest_view.create_relation_to_node();

                } else if (clicked_item_id == 'create_relation_link') {
                    this.$el.find('input#relation_link_dest').focus();

                } else {
                    this.forest_view.go_to_relation(clicked_item.data('relation-slug'));
                }
            },

            keypress_destination: function(evt) {
                // otherwise this will go to keypress_relation
                evt.stopPropagation();

                if (evt.which == 40) { // down arrow should focus first item in node list (if exists)
                    this.node_list_view.$el.find('div.node_list_item[tabindex=0]').focus();
                } else {
                    this.node_list_view.update_text($('input#relation_link_dest').val());
                }
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
