define(
    ['jquery', 'underscore', 'backbone',
        'js/models/user', 'js/models/node', 'js/models/relation', 'js/models/item',
        'js/collections/notifications', 'js/collections/relations',
        'js/views/statusbar', 'js/views/user', 'js/views/choices', 'js/views/node',
        'js/views/node_edit', 'js/views/relation_edit', 'js/views/item_edit', 'js/views/notifications', 'js/views/inventory', 'js/views/manage_content',
        'js/util/fetch_completions', 'tpl!templates/forest', 'tpl!templates/command_history'],
    function($, _, Backbone, User, Node, Relation, Item, Notifications, Relations, StatusBarView, UserView, ChoicesView,
        NodeView, NodeEditView, RelationEditView, ItemEditView, NotificationsView, InventoryView, ManageContentView,
        fetch_completions, foresttpl, commandhistorytpl) {

        return Backbone.View.extend({

            template: foresttpl,

            events: {
                'keyup input#prompt': 'keyup_prompt',
                'keypress input#prompt': 'keypress_prompt',
                'click div#modal': 'click_divmodal',
                'click span.node_link': 'node_link'
            },

            elements: {
                'prompt': 'input#prompt',
                'text_area': 'div#text_area',
                'divmodal': 'div#modal',
                'divmodal_user': 'div#modal_user',
                'divmodal_node_edit': 'div#modal_node_edit',
                'divmodal_relation_edit': 'div#modal_relation_edit',
                'divmodal_item_edit': 'div#modal_item_edit',
                'notifications': 'div#notifications'
            },

            initialize: function(options) {
                this.sort = 'views';
                this.sortdir = 'desc';
                this.sortpriop = true;

                this.relations_collection = new Relations({ 'sort': this.sort, 'sortdir': this.sortdir, 'sortpriop': this.sortpriop });
                this.notifications_collection = new Notifications();

                this.user = options.user;

                this.choices_view = new ChoicesView({ forest_view: this, relations_collection: this.relations_collection });
                this.user_view = new UserView({ forest_view: this, user: this.user });
                this.statusbar_view = new StatusBarView({ forest_view: this, user: this.user });
                this.notifications_view = new NotificationsView({ forest_view: this, user: this.user, notifications_collection: this.notifications_collection });
                this.inventory_view = new InventoryView({ forest_view: this, user: this.user });
                this.manage_content_view = new ManageContentView({ forest_view: this });

                this.node_edit_view = new NodeEditView({ forest_view: this });
                this.relation_edit_view = new RelationEditView({ forest_view: this });
                this.item_edit_view = new ItemEditView({ forest_view: this });

                this.node_counter = 0;
            },

            render: function() {
                this.$el.html(this.template({ user: this.user }));

                this.user_view.setElement(this.$el.find(this.elements.divmodal_user));

                this.choices_view.setElement(this.$el.find('div#choices'));

                this.statusbar_view.setElement(this.$el.find('div#status_bar'));
                this.statusbar_view.render();

                if (this.user.has('username')) {
                    this.notifications_view.setElement(this.$el.find('div#notifications'));
                    this.refresh_notifications();

                    this.inventory_view.setElement(this.$el.find('div#inventory'));
                    this.inventory_view.render();

                    this.manage_content_view.setElement(this.$el.find('div#manage_content'));
                    this.manage_content_view.render();

                    this.node_edit_view.setElement(this.$el.find(this.elements.divmodal_node_edit));
                    this.relation_edit_view.setElement(this.$el.find(this.elements.divmodal_relation_edit));
                    this.item_edit_view.setElement(this.$el.find(this.elements.divmodal_item_edit));
                }

                var self = this;
                $('body').click(
                    function(evt) {

                        if($(evt.target).closest('div#manage_content').length == 0 &&
                           $(evt.target).closest('div#notifications').length == 0 &&
                           $(evt.target).closest('div#inventory').length == 0 &&
                            
                           $(evt.target).closest('div#manage_content_link').length == 0 &&
                           $(evt.target).closest('div#notifications_link').length == 0 &&
                           $(evt.target).closest('div#inventory_link').length == 0 &&
                           
                           $(evt.target).closest('div#modal').length == 0 &&

                           (self.$el.find('div#manage_content:visible').length > 0 ||
                            self.$el.find('div#inventory:visible').length > 0 ||
                            self.$el.find('div#notifications:visible').length > 0)) { 
                            
                            self.$el.find('div#manage_content').hide();
                            self.$el.find('div#inventory').hide();
                            self.$el.find('div#notifications').hide();
                        }
                    });

                this.focus_prompt();
            },

            refresh_notifications: function() {
                if (!this.user.has('username')) {
                    return;
                }

                var self = this;
                this.notifications_collection.fetch({
                    success: function() {
                        self.statusbar_view.render();
                        self.notifications_view.render();
                    }
                });
            },

            user_link: function() {
                var self = this;
                if (this.user.get('username')) {
                    this.user.fetch({
                        success: function() {
                            self.user_view.render();
                            self.show_divmodal(self.elements.divmodal_user);
                        }
                    });
                } else {
                    this.user_view.render();
                    this.show_divmodal(this.elements.divmodal_user);
                }
            },

            logout_link: function() {
                var self = this;
                this.user.logout({
                    success: function() {
                        window.location.reload();
                    },
                    error: function(xhr, err, ex) {
                        self.add_error('Logout failed: ' + err.responseText);
                    }
                });
            },

            show_divmodal: function(innerdiv) {
                this.$el.find(this.elements.divmodal).show();
                this.$el.find(this.elements.divmodal).find('div.modal_content').hide();
                this.$el.find(this.elements.divmodal).find(innerdiv).show();
            },

            hide_divmodal: function() {
                this.$el.find(this.elements.divmodal).hide();
            },

            click_divmodal: function(evt) {
                if ($(evt.target).hasClass('modal')) {
                    this.hide_divmodal(this.divmodal_user);
                }
            },

            log_command: function(prompt_contents) {
                this.$el.find(this.elements.prompt).val('');
                this.$el.find(this.elements.text_area).append(commandhistorytpl({ command: prompt_contents }));
            },

            focus_prompt: function() {
                this.$el.find(this.elements.prompt).focus();
            },

            prompt_contents: function() {
                return this.$el.find(this.elements.prompt).val();
            },

            keypress_prompt: function(evt) {
                // input is wrapped in a form to prevent chrome
                // autocomplete.  since its a form we need to prevent
                // enter submit
                if(evt.which == 13) {
                    evt.preventDefault();
                }
            },

            keyup_prompt: function(evt) {

                evt.stopPropagation();

                var self = this;

                var prompt_contents = this.prompt_contents();

                if (evt.which == 40) {
                    // down arrow
                    this.$el.find('div.list_item').first().focus();
                    return;

                } else if (evt.which == 13) {

                    // enter
                    if (prompt_contents == '/edit') {
                        this.log_command(prompt_contents);
                        this.node_edit(this.current_node);

                    } else if (prompt_contents == '/delete') {
                        this.log_command(prompt_contents);
                        this.delete_node();

                    } else if (prompt_contents.slice(0, 3) == '/go') {
                        this.log_command(prompt_contents);
                        Backbone.history.navigate('/f/' + prompt_contents.slice(4), true);

                    } else if (prompt_contents == '/help') {
                        this.log_command(prompt_contents);
                        Backbone.history.navigate('/f/help', true);

                    } else if (prompt_contents[0] == '/') {
                        this.log_command(prompt_contents);
                        this.add_error('Invalid command: ' + prompt_contents);
                        this.$el.find(this.elements.prompt).val('');

                    } else {
                        // behave as if down arrow.. this way double RET will create text
                        this.$el.find('div[tabindex=0]').focus();

                    }
                }

                fetch_completions({
                    lastfetch: self.lastfetch,
                    refresh: function() {
                        self.relations_collection.set_search_text(prompt_contents);
                        self.refresh_choices();
                    },
                    noop_condition: function() {
                        return prompt_contents[0] == '/';
                    },
                    expedite_condition: function() {
                        return prompt_contents.length == 0;
                    }
                });
            },

            go_to_relation: function(slug, backward) {
                var selected_relation = this.relations_collection.findWhere({ 'slug': slug });

                if (selected_relation) {

                    var command;
                    if(backward) {
                        command = selected_relation.get('parent_name');
                    } else {
                        command = selected_relation.get('text');
                    }

                    this.$el.find(this.elements.text_area).append(commandhistorytpl({ command: command  }));

                    if(selected_relation.get('relationitems').length > 0) {
                        var self = this;
                        this.requires_login(function() { self.node_view_for_relation(selected_relation, backward); });
                    } else {
                        this.node_view_for_relation(selected_relation, backward);
                    }
                }
            },

            vote: function(slug, dir) {
                var relation = this.relations_collection.findWhere({ 'slug': slug });

                if (relation) {

                    // and update server in background
                    var self = this;
                    $.ajax({
                        url: '/xhr/relation/vote/' + slug + '/' + dir,
                        dataType: 'json',
                        success: function(data) {

                            if (data.success) {

                                if (dir == 'up') {
                                    relation.set('vote', relation.get('vote') + 1);
                                    self.choices_view.render();

                                } else if (dir == 'down') {
                                    relation.set('vote', relation.get('vote') - 1);
                                    self.choices_view.render();
                                }

                            } else {
                                self.add_error('Vote failed: ' + data.reason);
                            }
                        },
                        error: function(xhr, err, ex) {
                            self.add_error('Vote failed: ' + err.responseText);
                        }
                    });
                }
            },

            relation_edit: function(relation) {
                this.relation_edit_view.set_relation(relation);
                this.relation_edit_view.render('edit');
                this.show_divmodal(this.elements.divmodal_relation_edit);
            },

            edit_relation: function(slug) {
                var selected_relation = this.relations_collection.findWhere({ 'slug': slug });
                if (selected_relation) {
                    this.relation_edit(selected_relation);
                }
            },

            delete_relation: function(slug) {
                var self = this;
                var selected_relation = this.relations_collection.findWhere({ 'slug': slug });
                if (selected_relation) {

                    this.requires_login(
                        function() {
                            selected_relation.destroy({
                                wait: true,
                                success: function() {
                                    self.$el.find(self.elements.text_area).append(commandhistorytpl({ command: 'Deleted relation "' + slug + '"' }));
                                    self.node_view(self.current_node.get('slug'));
                                },
                                error: function(node, resp) {
                                    self.add_error(resp.responseText);
                                }
                            });
                        }
                    );
                }
            },

            add_error: function(err) {
                this.$el.find(this.elements.text_area).append('<div class="error">Error: ' + err + '</div>');
                this.scroll_bottom();
            },

            add_info_message: function(message) {
                this.$el.find(this.elements.text_area).append('<div class="info_message">' + message + '</div>');
                this.scroll_bottom();
            },

            scroll_bottom: function() {
                var text_area = this.$el.find(this.elements.text_area);
                text_area.scrollTop(text_area[0].scrollHeight);
            },

            node_link: function(evt) {
                var slug = $(evt.target).data('slug');
                this.log_command('click link /f/' + slug + '');
                Backbone.history.navigate('/f/' + encodeURIComponent($(evt.target).data('slug')), true);
            },

            requires_login: function(callable) {
                if (!this.user.get('username')) {
                    this.user_view.render();
                    this.show_divmodal(this.elements.divmodal_user);
                } else {
                    callable();
                }
            },

            refresh_choices: function() {
                var self = this;
                this.lastfetch = new Date().getTime();
                this.relations_collection.fetch({
                    success: function() { self.choices_view.render(); },
                    error: function(col, resp) { self.add_error(resp.responseText); }
                });
            },

            update_sort: function(sort, sortdir, sortpriop) {
                this.sort = sort;
                this.sortdir = sortdir;
                this.sortpriop = sortpriop;
                this.relations_collection.update_sort(sort, sortdir, sortpriop);
                this.statusbar_view.render();
                this.refresh_choices();
            },

            view_current_node: function() {
                // each time will replace the old view with a new view
                this.current_node_view = new NodeView({ node: this.current_node, forest_view: this });

                var node_div = $(document.createElement('DIV'))
                    .attr('class', 'node_text')
                    .attr('id', this.node_counter);

                this.$el.find(this.elements.text_area).append(node_div);
                this.current_node_view.setElement(node_div);

                this.node_counter += 1;
                this.current_node_view.render(this.node_counter);
                this.scroll_bottom();
                this.focus_prompt();
            },

            update_current_node: function() {
                this.update_choices();
                this.refresh_notifications();
                this.inventory_view.render();
                this.focus_prompt();
            },

            update_choices: function() {
                this.relations_collection.set_parent_node(this.current_node);
                this.relations_collection.set_search_text('');
                this.refresh_choices();

                this.$el.find(this.elements.prompt).val('');
            },

            node_view_for_relation: function(relation, backward) {
                var self = this;

                var original_node_slug = this.current_node.get('slug');

                // this is the fetch that actually applies relationitems..
                this.current_node = new Node({
                    direction: backward ? 'backward' : 'forward',
                    relation_slug: relation.get('slug')
                });
                
                this.current_node.fetch({
                    success: function() {

                        if(!backward && relation.get('relationitems').length > 0) {

                            if(relation.get('repeatable') || !relation.get('visited')) {
                                _.each(relation.get('relationitems'), function(ri, idx) {
                                    var info_message;
                                    if(ri.get('interaction') == 'give') {
                                        self.add_info_message('You receive '+ri.get('quantity')+' '+ri.get('item').get('name') + '.');
                                    } else if(ri.get('interaction') == 'consume') {
                                        self.add_info_message('You lose '+ri.get('quantity')+' '+ri.get('item').get('name') + '.');
                                    }
                                });
                            } else if(!relation.get('repeatable') && relation.get('relationitems').length > 0) {
                                self.add_info_message('(Item interactions skipped because this choice is not repeatable.)');
                            }

                            // server has applied item interactions, now we need to reload to pick them up
                            self.user.fetch({
                                success: function() {
                                    // update choices
                                    self.update_current_node();

                                    // inventory count might have changed
                                    self.statusbar_view.render();

                                    // also update inventory if its open
                                    if(self.inventory_view.$el.is(':visible')) {
                                        self.inventory_view.render();
                                    }
                                },
                                error: function(col, resp) { self.add_error(resp.responseText); }
                            });
                        }

                        // draw new node if we moved
                        if(original_node_slug && original_node_slug != self.current_node.get('slug')) {
                            self.view_current_node();
                            self.update_current_node();
                        }

                        Backbone.history.navigate('/f/' + self.current_node.get('slug'));
                    },
                    error: function(col, resp) { self.add_error(resp.responseText); }
                });
            },

            node_view: function(slug) {
                var self = this;
                this.current_node = new Node({ slug: slug });
                this.current_node.fetch({
                    success: function() {
                        self.update_current_node();
                        self.view_current_node();
                    },
                    error: function(col, resp) { self.add_error(resp.responseText); }
                });
            },

            node_inline_create: function(inline_create_options) {
                var self = this;

                this.show_divmodal(this.elements.divmodal_node_edit);

                // wrap the callback in our own code to handle modal visibility
                var callback_on_save = inline_create_options.callback_on_save;
                inline_create_options.callback_on_save = function(created_node) {
                    self.show_divmodal(inline_create_options.return_to_divmodal);
                    callback_on_save(created_node);
                };

                this.node_edit_view.render('create', inline_create_options);
            },

            item_edit: function(item) {
                this.item_edit_view.set_item(item);
                this.item_edit_view.render('edit');
                this.show_divmodal(this.elements.divmodal_item_edit);
            },

            item_inline_create: function(inline_options) {
                var self = this;

                this.show_divmodal(this.elements.divmodal_item_edit);

                // wrap the callback in our own code to handle modal visibility
                var callback_on_save = inline_options.callback_on_save;
                inline_options.callback_on_save = function(created_node) {
                    self.show_divmodal(inline_options.return_to_divmodal);
                    callback_on_save(created_node);
                };

                this.item_edit_view.render('create', inline_options);
            },

            relation_inline_create: function() {
                var self = this;
                this.relation_edit_view.render(
                    'create',
                    {
                        initial_name: this.prompt_contents(),
                        initial_slug: this.current_node.get('slug'),
                        callback_on_save: function() {
                            self.update_current_node();
                            self.hide_divmodal();
                        }
                    });

                this.show_divmodal(this.elements.divmodal_relation_edit);
            },

            node_edit: function(node) {
                var self = this;
                this.node_edit_view.set_node(node);
                this.node_edit_view.render(
                    'edit',
                    {
                        callback_on_save: function() {
                            self.update_current_node();
                            self.hide_divmodal();
                        }
                    });

                this.show_divmodal(this.elements.divmodal_node_edit);
            },

            node_delete: function(node) {
                var self = this;

                var deleting_current_node = node.get('slug') == self.current_node.get('slug');

                node.destroy({
                    success: function() {
                        if(deleting_current_node) {

                            // if we deleted the node we are actually on, go home
                            Backbone.history.navigate('/f/home', true);

                        } else {
                            self.update_current_node();
                        }
                    }
                });
            }

        });
    }
);
