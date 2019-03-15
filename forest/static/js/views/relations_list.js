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
                'click button#create_branch_cancel': 'create_branch_cancel',
                'click button#create_branch_create': 'create_branch_create',
                'click .list_item': 'click_relation',
                'keyup .list_item': 'keypress_relation',
                'keyup input#relation_create_dest': 'keypress_create_dest',
                'click .voteup': 'vote_up',
                'click .votedown': 'vote_down'
            },

            initialize: function(options) {
                this.forest_view = options.forest_view;
                this.node_list_view = new NodeList({ forest_view: this.forest_view, relations_list_view: this });
            },

            render: function(relations_collection) {

                this.create_to_existing_node = undefined;

                if (relations_collection) {
                    this.relations_collection = relations_collection;

                    // if this is trying to refresh the relations list
                    // when the create form is visible, dont let it
                    // because that would interrupt the user.  we
                    // still let it update the collection so if the
                    // user hits 'cancel' theyll see the latest
                    // results.
                    if (this.$el.find('div#create_relation_form').is(':visible')) {
                        return;
                    }
                }

                // we will restore the users focused tabindex after rendering
                var focused_tabindex = this.$el.find('div.list_item:focus').attr('tabindex');

                this.$el.html(this.template({ relations: this.relations_collection, user: this.forest_view.user }));

                this.node_list_view.setElement('div#existing_list');
                this.node_list_view.render();

                if (focused_tabindex) {
                    this.$el.find('div.list_item[tabindex=' + focused_tabindex + ']').focus();
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
                    this.$el.find('div.existing_relation').hide();
                    this.$el.find('div#create_relation').hide();
                    this.$el.find('div#create_relation_form').show();

                    this.$el.find('input#relation_create_dest').val(this.forest_view.prompt_contents());
                    this.update_dest_node_list();

                } else {
                    this.forest_view.go_to_relation(
                        clicked_item.data('relation-slug'),
                        clicked_item.hasClass('list_item_backwards'));
                }

                evt.stopPropagation();
            },

            create_branch_existing_node_select: function(node) {
                this.$el.find('div#relation_create_dest_select').html(node.to_string());
                this.create_to_existing_node = node;
            },

            create_branch_cancel: function(evt) {
                this.render();
            },

            create_branch_create: function(evt) {
                this.forest_view.create_relation_to_node(this.create_to_existing_node);
                this.render();
            },

            keypress_create_dest: function(evt) {
                if (evt.which == 40) { // down arrow should focus first item in node list (if exists)
                    this.node_list_view.$el.find('div.node_list_item[tabindex=0]').focus();
                } else {
                    this.update_dest_node_list();
                }
            },

            update_dest_node_list: function() {
                this.node_list_view.update_text(this.$el.find('input#relation_create_dest').val());
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
