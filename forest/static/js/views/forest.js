define(
    ['jquery', 'underscore', 'backbone',
        'models/user', 'models/node', 'models/relation',
        'collections/notifications', 'collections/relations',
        'views/statusbar', 'views/user', 'views/relations', 'views/node', 'views/node_edit', 'views/notifications',
        'util/fetch_completions', 'tpl!templates/forest', 'tpl!templates/command_history'],
    function($, _, Backbone, User, Node, Relation, Notifications, Relations, StatusBarView, UserView, RelationsView,
        NodeView, NodeEditView, NotificationsView, fetch_completions, foresttpl, commandhistorytpl) {

        var global = this;

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
                'notifications': 'div#notifications'
            },

            initialize: function(options) {
                this.sort = 'views';
                this.sortdir = 'desc';
                this.sortpriop = true;

                this.relations_collection = new Relations({ 'sort': this.sort, 'sortdir': this.sortdir, 'sortpriop': this.sortpriop });
                this.notifications_collection = new Notifications();

                this.user = new User({ 'username': options.username });

                this.relations_view = new RelationsView({ forest_view: this });
                this.relations_view.set_relations_collection(this.relations_collection);

                this.user_view = new UserView({ forest_view: this, user: this.user });
                this.statusbar_view = new StatusBarView({ forest_view: this, user: this.user });
                this.notifications_view = new NotificationsView({ forest_view: this, user: this.user, notifications_collection: this.notifications_collection });

                this.node_counter = 0;
            },

            render: function() {
                this.$el.html(this.template({ user: this.user }));

                this.user_view.setElement(this.$el.find('div#modal'));

                this.relations_view.setElement(this.$el.find('div#relations'));
                this.relations_view.render();

                this.statusbar_view.setElement(this.$el.find('div#status_bar'));
                this.statusbar_view.render();

                this.notifications_view.setElement(this.$el.find('div#notifications'));

                this.refresh_notifications();

                this.$el.find(this.elements.prompt).focus();
            },

            refresh_notifications: function() {
                var self = this;
                this.notifications_collection.fetch({
                    success: function() {
                        self.statusbar_view.render();
                        self.notifications_view.render();
                    }
                });
            },

            user_link: function() {

                if (this.$el.find(this.elements.divmodal).is(':visible')) {
                    this.hide_divmodal();
                    return;
                }

                var self = this;
                if (this.user.get('username')) {
                    this.user.fetch({
                        success: function() {
                            self.user_view.render();
                            self.show_divmodal();
                        }
                    });
                } else {
                    this.user_view.render();
                    this.show_divmodal();
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

            show_divmodal: function() {
                this.$el.find(this.elements.divmodal).show();
            },

            hide_divmodal: function() {
                this.$el.find(this.elements.divmodal).hide();
            },

            click_login_button: function() {
                var self = this;
                this.user.login({
                    success: function() {
                        self.statusbar_view.render();
                        self.$el.find(this.elements.divmodal).hide();
                    },
                    failure: function(error) {
                        self.user_view.set_error(error);
                    }
                });
            },

            click_divmodal: function(evt) {
                if ($(evt.target).attr('id') == 'modal') {
                    this.hide_divmodal();
                }
            },

            log_command: function(prompt_contents) {
                this.$el.find(this.elements.prompt).val('');
                this.$el.find(this.elements.text_area).append(commandhistorytpl({ command: prompt_contents }));
            },

            keypress_prompt: function(evt) {
                var self = this;

                var prompt_contents = this.$el.find(this.elements.prompt).val();

                if (evt.which == 40) {

                    // down arrow
                    this.$el.find('div[tabindex=0]').focus();
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
                                    success: function() { self.relations_view.render_list(); },
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

            go_to_relation: function(slug, backwards) {
                var selected_relation = this.relations_collection.findWhere({ 'slug': slug });

                if (selected_relation) {
                    this.$el.find(this.elements.text_area).append(commandhistorytpl({ command: selected_relation.get('text') }));
                    this.node_view_for_relation(selected_relation.get('slug'), backwards);
                }
            },

            create_relation_to_node: function(node) {

                var relation = new Relation();
                relation.set('text', this.$el.find(this.elements.prompt).val());
                relation.set('parent', this.current_node.get('slug'));

                // if we do not pass in child slug, django will create a new node automatically.  this allows this method
                // to pass in node to link to existing, or undefined to create new.
                var creating = true;
                if (node) {
                    relation.set('child', node.get('slug'));
                    creating = false;
                }

                var self = this;

                this.requires_login(
                    function() {
                        relation.save(
                            {},
                            {
                                success: function() {
                                    self.relations_collection.add(relation);
                                    self.go_to_relation(relation.get('slug'));
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
                                    self.relations_view.render_list();

                                } else if (dir == 'down') {
                                    relation.set('vote', relation.get('vote') - 1);
                                    self.relations_view.render_list();
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
            },

            scroll_bottom: function() {
                var text_area = this.$el.find(this.elements.text_area);
                text_area.scrollTop(text_area[0].scrollHeight);
            },

            user_page_link: function(evt) {
                Backbone.history.navigate('/f/~' + $(evt.target).data('user-link'), true);
            },

            node_link: function(evt) {
                Backbone.history.navigate('/f/' + $(evt.target).data('node-link'), true);
            },

            relation_link: function(evt) {
                Backbone.history.navigate('/r/' + $(evt.target).data('relation-link'), true);
            },

            requires_login: function(callable) {
                if (!this.user.get('username')) {
                    this.user_view.render();
                    this.show_divmodal();
                } else {
                    callable();
                }
            },

            fetch_relations_collection: function() {
                var self = this;
                this.relations_collection.fetch({
                    success: function() { self.relations_view.render_list(); },
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

            update_current_node: function() {

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

                // update relations collection for new node and reset
                this.relations_collection.set_parent_node(this.current_node);
                this.relations_collection.set_search_text('');
                this.fetch_relations_collection();

                // clear prompt
                this.$el.find(this.elements.prompt).val('').focus();
            },

            ////////////
            // routes

            node_view_for_relation: function(relation_slug, backwards) {
                var self = this;

                this.current_node = new Node({
                    direction: backwards ? 'backwards' : 'forwards',
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
                var self = this;

                this.current_node = new Node({ slug: slug });
                this.current_node.fetch({
                    success: function() {
                        self.update_current_node();
                        self.refresh_notifications();
                    },
                    error: function(col, resp) { self.add_error(resp.responseText); }
                });
            },

            node_edit: function(slug) {
                var self = this;

                this.requires_login(
                    function() {

                        if (slug) {
                            self.current_node.set('slug', slug);
                        }

                        self.current_node.fetch(
                            {
                                success: function() {

                                    if (self.current_node.get('author') != self.user.get('username')) {
                                        self.add_error('You cannot edit this because you do not own it.');
                                        return;
                                    }

                                    // create new nodeview and render (appends to text_area)
                                    var node_edit = new NodeEditView({ node: self.current_node, forest_view: self });

                                    var node_div = $(document.createElement('DIV')).attr('class', 'node_edit');
                                    self.$el.find(self.elements.text_area).append(node_div);

                                    node_edit.setElement(node_div);
                                    node_edit.render();

                                    self.scroll_bottom();

                                    // clear out relations collection
                                    self.relations_collection.reset();

                                    // clear prompt
                                    self.$el.find(self.elements.prompt).val('');

                                    // redraw relations view
                                    self.relations_view.render();
                                },
                                error: function(col, resp) { self.add_error(resp.responseText); }
                            }
                        );
                    }
                );
            }
        });
    }
);
