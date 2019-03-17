define(
    ['jquery',
        'underscore',
        'backbone',
        'put_cursor_at_end',
        'views/node_list',
        'views/item_list',
        'tpl!templates/choices'],
    function($, _, Backbone, put_cursor_at_end, NodeList, ItemList, relationslisttpl) {
        return Backbone.View.extend({

            template: relationslisttpl,

            events: {
                'keyup input#relation_create_dest': 'keypress_create_dest',
                'keyup input#relation_create_require_item': 'keypress_create_require_item',
                'keyup input#relation_give_item': 'keypress_give_item',

                'keyup button#create_branch_cancel': 'keypress_button_cancel',
                'click button#create_branch_cancel': 'create_cancel',

                'keyup button#create_branch_create': 'keypress_button_create',
                'click button#create_branch_create': 'create_branch_create',

                'keyup button#create_item_give_cancel': 'keypress_item_give_cancel',
                'click button#create_item_give_cancel': 'create_cancel',

                'keyup button#create_item_give_create': 'keypress_item_give_create',
                'click button#create_item_give_create': 'create_item_give_create',

                'keyup .list_item': 'keypress_list_item',
                'click .list_item': 'click_list_item',

                'click .voteup': 'vote_up',
                'click .votedown': 'vote_down'
            },

            initialize: function(options) {
                var self = this;

                this.forest_view = options.forest_view;
                this.relations_collection = options.relations_collection;
                this.node_list_view = new NodeList({ forest_view: this.forest_view, choices_view: this });

                this.require_item_list_view = new ItemList({
                    forest_view: this.forest_view,
                    choices_view: this,
                    on_select: function(item) {
                        self.create_branch_existing_item_select(item);
                    }
                });

                this.give_item_list_view = new ItemList({
                    forest_view: this.forest_view,
                    choices_view: this,
                    on_select: function(item) {
                        self.item_give_existing_item_select(item);
                    }
                });
            },

            render: function(autocomplete_render_cycle) {

                this.create_to_existing_node = undefined;
                this.create_to_existing_item = undefined;
                this.give_existing_item = undefined;

                if (autocomplete_render_cycle) {
                    // if this is trying to refresh the relations list
                    // when the create form is visible, dont let it
                    // because that would interrupt the user.  we
                    // still let it update the collection so if the
                    // user hits 'cancel' theyll see the latest
                    // results.
                    if (this.$el.find('div#create_relation_form').is(':visible') ||
                        this.$el.find('div#give_item_form').is(':visible')) {
                        return;
                    }
                }

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

                this.node_list_view.setElement('div#existing_list');
                this.node_list_view.render();

                this.require_item_list_view.setElement('div#require_item_list');
                this.give_item_list_view.setElement('div#give_item_list');

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

                    if (clicked_item.data('relation-slug')) {
                        this.forest_view.delete_relation(clicked_item.data('relation-slug'));
                    }

                    if (clicked_item.data('item-slug')) {
                        this.forest_view.delete_item_giver(clicked_item.data('item-slug'));
                    }

                } else if (clicked_item_id == 'create_relation') {

                    this.$el.find('div.list_item').hide();
                    this.$el.find('div#create_give_item_form').hide();
                    this.$el.find('div#create_relation_form').show();

                    this.$el.find('input#relation_create_dest').val(this.forest_view.prompt_contents()).focus();
                    this.update_dest_node_list();

                } else if (clicked_item_id == 'create_give_item') {

                    this.$el.find('div.list_item').hide();
                    this.$el.find('div#create_relation_form').hide();
                    this.$el.find('div#create_give_item_form').show();

                    this.$el.find('input#relation_give_item').val(this.forest_view.prompt_contents()).focus();
                    this.update_give_item_list();

                } else if (clicked_item.hasClass('item_list_item') && !clicked_item.hasClass('item_owned')) {

                    this.forest_view.take_item(clicked_item.data('item-slug'));

                } else {

                    this.forest_view.go_to_relation(
                        clicked_item.data('relation-slug'),
                        clicked_item.hasClass('list_item_backward'));
                }

                evt.stopPropagation();
            },

            create_branch_existing_node_select: function(node) {
                this.create_to_existing_node = node;
                this.$el.find('div#relation_create_dest_select').html(node.to_string());
                this.$el.find('input#relation_create_require_item').focus();
            },

            create_branch_existing_item_select: function(item) {
                this.create_to_existing_item = item;
                this.$el.find('div#relation_create_item_select').html(item.to_string());
                this.$el.find('button#create_branch_cancel').focus();
            },

            item_give_existing_item_select: function(item) {
                this.give_existing_item = item;
                this.$el.find('div#relation_give_item_select').html(item.to_string());
                this.$el.find('button#create_item_give_cancel').focus();
            },

            create_cancel: function(evt) {
                this.render();
                this.forest_view.focus_prompt();
            },

            create_item_give_create: function(evt) {
                this.forest_view.create_item_giver(
                    this.give_existing_item,
                    this.$el.find('input#relation_give_item').val());
            },

            create_branch_create: function(evt) {
                this.forest_view.create_relation_to_node(
                    this.create_to_existing_node,
                    this.$el.find('input#relation_create_dest').val(),
                    this.create_to_existing_item,
                    this.$el.find('input#relation_create_require_item').val()
                );
            },

            keypress_create_dest: function(evt) {
                if (evt.which == 38) {
                    this.forest_view.focus_prompt();
                } else if (evt.which == 40) { // down arrow should focus first item in node list (if exists)
                    var node_list_item = this.node_list_view.$el.find('div.node_list_item[tabindex=0]');
                    if (node_list_item.length > 0) {
                        node_list_item.focus();
                    } else {
                        this.$el.find('input#relation_create_require_item').focus();
                    }
                } else {
                    this.update_dest_node_list();
                }
            },

            keypress_give_item: function(evt) {
                if (evt.which == 38) {
                    this.forest_view.focus_prompt();
                } else if (evt.which == 40) {
                    this.$el.find('button#create_item_give_cancel').focus();
                } else {
                    this.update_give_item_list();
                }
            },

            keypress_create_require_item: function(evt) {
                if (evt.which == 38) {
                    if (this.$el.find('input#relation_create_dest').is(':visible')) {
                        this.$el.find('input#relation_create_dest').focus();
                    } else {
                        this.forest_view.focus_prompt();
                    }
                } else if (evt.which == 40) {
                    this.$el.find('button#create_branch_cancel').focus();
                } else {
                    this.update_require_item_list();
                }
            },

            keypress_button_cancel: function(evt) {
                if (evt.which == 38) {
                    this.$el.find('input#relation_create_require_item').focus();
                } else if (evt.which == 40) {
                    this.$el.find('button#create_branch_create').focus();
                }
            },

            keypress_item_give_cancel: function(evt) {
                if (evt.which == 38) {
                    this.$el.find('input#relation_give_item').focus();
                } else if (evt.which == 40) {
                    this.$el.find('button#create_item_give_create').focus();
                }
            },

            keypress_item_give_create: function(evt) {
                if (evt.which == 38) {
                    this.$el.find('button#create_item_give_cancel').focus();
                }
            },

            keypress_button_create: function(evt) {
                if (evt.which == 38) {
                    this.$el.find('button#create_branch_cancel').focus();
                }
            },

            update_dest_node_list: function() {
                this.node_list_view.update_text(this.$el.find('input#relation_create_dest').val());
            },

            update_require_item_list: function() {
                this.require_item_list_view.update_text(this.$el.find('input#relation_create_require_item').val());
            },

            update_give_item_list: function() {
                this.give_item_list_view.update_text(this.$el.find('input#relation_give_item').val());
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
