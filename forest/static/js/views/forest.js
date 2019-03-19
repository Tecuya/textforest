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
                'keyup input#prompt': 'keypress_prompt',
                'click div#modal': 'click_divmodal',
                'click span.user_link': 'user_page_link',
                'click span.node_link': 'node_link',
                'click span.relation_link': 'relation_link'
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

                // if (this.$el.find(this.elements.divmodal_user).is(':visible')) {
                //     this.hide_divmodal(this.divmodal_user);
                //     return;
                // }

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
                        self.statusbar_view.render();
                    },
                    error: function(xhr, err, ex) {
                        self.add_error('Logout failed: ' + err.responseText);
                    }
                });
            },

            show_divmodal: function(innerdiv, dont_hide_others) {
                this.$el.find(this.elements.divmodal).show();
                if (!dont_hide_others) {
                    this.$el.find(this.elements.divmodal).find('div.modal_content').hide();
                }
                this.$el.find(this.elements.divmodal).find(innerdiv).show();
            },

            hide_divmodal: function() {
                this.$el.find(this.elements.divmodal).hide();
            },

            click_login_button: function() {
                var self = this;
                this.user.login({
                    success: function() {
                        window.location.reload();
                    },
                    failure: function(error) {
                        self.user_view.set_error(error);
                    }
                });
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
                var self = this;

                var prompt_contents = this.prompt_contents();

                if (evt.which == 40) {
                    // down arrow

                    // jump to appropriate piece of creation form, if visible... (messy)
                    if ($('div#create_relation_form').is(':visible')) {
                        if ($('input#relation_create_dest').is(':visible')) {
                            $('input#relation_create_dest').focus();
                        } else if ($('input#relation_create_require_item').is(':visible')) {
                            $('input#relation_create_require_item').focus();
                        } else {
                            $('button#create_branch_cancel').focus();
                        }
                    } else if ($('div#create_give_item_form').is(':visible')) {
                        $('input#relation_give_item').focus();
                    } else {
                        this.$el.find('div.list_item').first().focus();
                    }
                    return;

                } else if (evt.which == 13) {

                    // enter
                    if (prompt_contents == '/edit') {
                        this.log_command(prompt_contents);
                        this.node_edit();

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

                // without this short timeout it seems the event fires
                // before jquerys val could get the updated text
                window.setTimeout(
                    function() {
                        fetch_completions(
                            self.lastfetch,
                            function() {
                                self.lastfetch = new Date().getTime();
                                self.relations_collection.set_search_text(prompt_contents);

                                if (prompt_contents[0] == '/') {
                                    return;
                                }

                                self.relations_collection.fetch({
                                    success: function() { self.choices_view.render(true); },
                                    error: function(col, err) { self.add_error(err.responseText); }
                                });
                            });
                    }, 10);
            },

            delete_node: function() {
                var self = this;
                this.requires_login(
                    function() {
                        if (self.current_node.get('author') != self.user.get('username')) {
                            self.add_error('You cannot delete this because you do not own it.');
                            return;
                        }

                        self.current_node.destroy({
                            wait: true,
                            success: function() { history.back(); },
                            error: function(node, resp) {
                                self.add_error(resp.responseText);
                            }
                        });
                    }
                );
            },

            go_to_relation: function(slug, backward) {
                var selected_relation = this.relations_collection.findWhere({ 'slug': slug });

                if (selected_relation) {

                    if (selected_relation.get('direction') == 'forward' && selected_relation.get('require_item') && !selected_relation.get('require_item').get('owned')) {
                        this.log_command(selected_relation.get('text'));
                        this.add_error('You lack the required item "' + selected_relation.get('require_item').get('name') + '"');
                        return;
                    }

                    this.$el.find(this.elements.text_area).append(commandhistorytpl({ command: selected_relation.get('text') }));
                    this.node_view_for_relation(selected_relation.get('slug'), backward);
                }
            },

            take_item: function(slug) {

                var self = this;

                this.requires_login(
                    function() {

                        var taken_item;
                        _.each(self.current_node.get('items'), function(item, idx) {
                            if (item.get('slug') == slug) {
                                taken_item = item;
                                return;
                            }
                        });

                        if (!taken_item) {
                            self.add_error('The item you tried to take does not exist.');
                            return;
                        }

                        var items = [];
                        if (self.user.has('items')) {
                            items = self.user.get('items');
                        }

                        items.push(taken_item);

                        self.user.set('items', items);
                        self.user.save(
                            {},
                            {
                                success: function() {
                                    self.log_command('Pick up ' + taken_item.get('name'));
                                    self.add_info_message('You picked up item: ' + taken_item.get('name'));
                                    self.inventory_view.render();
                                    self.statusbar_view.render();

                                    self.current_node.fetch(
                                        {
                                            success: function() {
                                                self.update_choices();
                                            },
                                            error: function(col, err) { self.add_error(err.responseText); }
                                        });
                                },
                                error: function(xhr, err, ex) {
                                    self.add_error('Node save failed: ' + err.responseText);
                                }
                            });
                    });
            },

            create_item_giver: function(existing_item, new_item_name) {

                var self = this;

                function add_item_to_current_node(item) {

                    var current_item_gives = self.current_node.get('items');
                    current_item_gives.push(item);

                    self.current_node.save(
                        {},
                        {
                            success: function() {
                                self.update_current_node();
                            },
                            error: function(xhr, err, ex) {
                                self.add_error('Node save failed: ' + err.responseText);
                            }
                        });
                };

                if (existing_item) {
                    add_item_to_current_node(existing_item);
                } else {
                    existing_item = new Item({ 'name': new_item_name });
                    existing_item.save(
                        {},
                        {
                            success: function() {
                                add_item_to_current_node(existing_item);
                            },
                            error: function(xhr, err, ex) {
                                self.add_error('Item creation failed: ' + err.responseText);
                            }
                        });
                }
            },

            create_relation_to_node: function(existing_node, new_node_name, existing_required_item, new_required_item_name) {

                var relation = new Relation();
                relation.set('text', this.prompt_contents());
                relation.set('parent', this.current_node.get('slug'));

                if (existing_required_item) {
                    relation.set('required_item', existing_required_item.get('slug'));
                } else {
                    relation.set('_new_required_item_name', new_required_item_name);
                }

                // if we do not pass in child slug, django will create a new node automatically.  this allows this method
                // to pass in node to link to existing, or undefined to create new.
                var creating;

                if (existing_node) {
                    creating = false;
                    relation.set('child', existing_node.get('slug'));

                } else {
                    creating = true;
                    relation.set('_new_node_name', new_node_name); // server knows to handle this special value to name created nodes
                }

                var self = this;

                this.requires_login(
                    function() {
                        relation.save(
                            {},
                            {
                                success: function() {

                                    self.relations_collection.add(relation);

                                    if (creating) {
                                        self.node_edit(relation.get('child'));
                                    } else {
                                        self.go_to_relation(relation.get('slug'));
                                    }
                                },
                                error: function(err, resp) {
                                    self.add_error(resp.responseText);
                                }
                            });
                    });
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
                                    self.choices_view.render_list();

                                } else if (dir == 'down') {
                                    relation.set('vote', relation.get('vote') - 1);
                                    self.choices_view.render_list();
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

            delete_item_giver: function(slug) {
                var self = this;

                this.current_node.set(
                    'items',
                    _.filter(
                        this.current_node.get('items'),
                        function(item, idx) {
                            return item.get('slug') != slug;
                        }
                    ));

                this.current_node.save(
                    {},
                    {
                        success: function() { self.update_current_node(); },
                        error: function(xhr, err) { self.add_error(err.responseText); }
                    });
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

            user_page_link: function(evt) {
                Backbone.history.navigate('/f/~' + encodeURIComponent($(evt.target).data('user-link')), true);
            },

            node_link: function(evt) {
                Backbone.history.navigate('/f/' + encodeURIComponent($(evt.target).data('node-link')), true);
            },

            relation_link: function(evt) {
                Backbone.history.navigate('/r/' + encodeURIComponent($(evt.target).data('relation-link')), true);
            },

            requires_login: function(callable) {
                if (!this.user.get('username')) {
                    this.user_view.render();
                    this.show_divmodal(this.divmodal_user);
                } else {
                    callable();
                }
            },

            fetch_relations_collection: function() {
                var self = this;
                this.relations_collection.fetch({
                    success: function() { self.choices_view.render(true); },
                    error: function(col, resp) { self.add_error(resp.responseText); }
                });
            },

            update_sort: function(sort, sortdir, sortpriop) {
                this.sort = sort;
                this.sortdir = sortdir;
                this.sortpriop = sortpriop;
                this.relations_collection.update_sort(sort, sortdir, sortpriop);
                this.statusbar_view.render();
                this.fetch_relations_collection();
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
                this.view_current_node();
                this.update_choices();
                this.refresh_notifications();
                this.inventory_view.render();
            },

            update_choices: function() {
                // update relations collection for new node and reset
                this.relations_collection.set_parent_node(this.current_node);
                this.relations_collection.set_search_text('');
                this.fetch_relations_collection();

                // clear prompt
                this.$el.find(this.elements.prompt).val('');
                this.choices_view.render();
            },

            refresh_current_node: function() {
                var self = this;
                this.current_node.fetch({
                    success: function() { self.update_current_node(); },
                    error: function(col, resp) { self.add_error(resp.responseText); }
                });
            },

            ////////////
            // routes

            node_view_for_relation: function(relation_slug, backward) {
                var self = this;

                this.current_node = new Node({
                    direction: backward ? 'backward' : 'forward',
                    relation_slug: relation_slug
                });
                this.current_node.fetch({
                    success: function() {
                        self.update_current_node();
                        Backbone.history.navigate('/f/' + self.current_node.get('slug'));
                    },
                    error: function(col, resp) { self.add_error(resp.responseText); }
                });
            },

            node_view: function(slug) {
                this.current_node = new Node({ slug: slug });
                this.refresh_current_node();
            },

            node_edit: function(node) {
                this.node_edit_view.set_node(node);
                this.node_edit_view.render('edit');
                this.show_divmodal(this.elements.divmodal_node_edit);
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
                this.item_edit_view.render();
                this.show_divmodal(this.elements.divmodal_item_edit);
            },

            relation_edit: function(relation) {
                this.relation_edit_view.set_relation(relation);
                this.relation_edit_view.render();
                this.show_divmodal(this.elements.divmodal_relation_edit);
            }
        });
    }
);
