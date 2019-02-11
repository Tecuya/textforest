define(
    ['jquery', 'underscore', 'backbone', 'models/user', 'models/node', 'models/relation',
        'collections/relations',
        'views/statusbar',
        'views/user', 'views/relations',
        'views/node', 'views/node_edit',
        'util/fetch_completions', 'tpl!templates/forest', 'tpl!templates/command_history'],
    function($, _, Backbone, User, Node, Relation, Relations, StatusBarView, UserView, RelationsView,
        NodeView, NodeEditView, fetch_completions, foresttpl, commandhistorytpl) {

        var global = this;

        return Backbone.View.extend({

            template: foresttpl,

            events: {
                'keyup input#prompt': 'keypress_prompt',
                'click div#login_link': 'user_link',
                'click div#logout_link': 'logout_link',
                'click div#user_settings_link': 'user_link',
                'click div#modal': 'click_divmodal'
            },

            elements: {
                'prompt': 'input#prompt',
                'text_area': 'div#text_area',
                'login_link': 'div#login_link',
                'divmodal': 'div#modal'
            },

            initialize: function(options) {
                this.relations_collection = new Relations();

                this.relations_view = new RelationsView({ forest_view: this });
                this.relations_view.set_relations_collection(this.relations_collection);

                this.user = new User({ 'username': options.username });

                this.user_view = new UserView({ forest_view: this, user: this.user });
                this.statusbar_view = new StatusBarView({ forest_view: this, user: this.user });

                this.node_counter = 0;
            },

            render: function() {
                this.$el.html(this.template({ user: this.user }));

                this.user_view.setElement(this.$el.find('div#modal'));

                this.relations_view.setElement(this.$el.find('div#relations'));
                this.relations_view.render();

                this.statusbar_view.setElement(this.$el.find('div#status_bar'));
                this.statusbar_view.render();

                this.$el.find(this.elements.prompt).focus();
            },

            user_link: function() {
                this.user_view.render();
                this.show_divmodal();
            },

            logout_link: function() {
                var self = this;
                this.user.logout({
                    success: function() {
                        self.statusbar_view.render();
                    },
                    error: function(xhr, err, ex) {
                        self.add_error('Logout failed: ' + err);
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

            keypress_prompt: function(evt) {
                var self = this;

                var prompt_contents = this.$el.find(this.elements.prompt).val();

                if (evt.which == 40) {

                    // down arrow
                    this.$el.find('div[tabindex=0]').focus();
                    return;

                } else if (evt.which == 13) {

                    var log_command = function() {
                        self.$el.find(self.elements.text_area).append(commandhistorytpl({ command: prompt_contents }));
                    };

                    // enter
                    if (prompt_contents == '/edit') {
                        self.node_edit();

                    } else if (prompt_contents == '/delete') {
                        log_command();
                        this.current_node.destroy({
                            wait: true,
                            success: function() { history.back(); },
                            error: function(node, resp) {
                                self.add_error(resp);
                            }
                        });

                    } else if (prompt_contents.slice(0, 3) == '/go') {
                        log_command();
                        Backbone.history.navigate('/f/' + prompt_contents.slice(4), true);

                    } else if (prompt_contents == '/help') {
                        log_command();
                        Backbone.history.navigate('/f/help', true);

                    } else if (prompt_contents[0] == '/') {
                        log_command();
                        self.add_error('Invalid command: ' + prompt_contents);
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
                        if (prompt_contents.length == 0 || prompt_contents[0] == '/') {
                            return;
                        }

                        fetch_completions(
                            self.lastfetch,
                            function() {
                                self.lastfetch = new Date().getTime();
                                self.relations_collection.set_search_text(prompt_contents);
                                self.relations_collection.fetch({
                                    success: function() { self.relations_view.render_list(); },
                                    error: function(col, err) { self.add_error(err); }
                                });
                            });
                    }, 10);
            },

            go_to_relation: function(slug) {
                var selected_relation = this.relations_collection.findWhere({ 'slug': slug });

                if (selected_relation) {
                    this.$el.find(this.elements.text_area).append(commandhistorytpl({ command: selected_relation.get('text') }));
                    Backbone.history.navigate('/f/' + selected_relation.get('child'), true);
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
                                    self.add_error(resp);
                                }
                            });
                    });
            },

            delete_relation: function(slug) {
                var self = this;

                var selected_relation = this.relations_collection.findWhere({ 'slug': slug });

                if (selected_relation) {
                    selected_relation.destroy({
                        wait: true,
                        success: function() {
                            self.$el.find(self.elements.text_area).append(commandhistorytpl({ command: 'Deleted relation "' + slug + '"' }));
                            self.node_view(self.current_node.get('slug'));
                        },
                        error: function(node, resp) {
                            self.add_error(resp);
                        }
                    });
                }
            },

            add_error: function(err) {
                this.$el.find(this.elements.text_area).append('<div class="error">Error: ' + err.responseText + '</div>');
            },

            scroll_bottom: function() {
                var text_area = this.$el.find(this.elements.text_area);
                text_area.scrollTop(text_area[0].scrollHeight);
            },

            requires_login: function(callable) {
                if (!this.user.get('username')) {
                    $('div#modal').show();
                } else {
                    callable();
                }
            },

            ////////////
            // routes

            node_view: function(slug) {
                var self = this;

                this.current_node = new Node({ slug: slug });
                this.current_node.fetch(
                    {
                        success: function() {

                            // each time will replace the old view with a new view
                            self.current_node_view = new NodeView({ node: self.current_node, forest_view: self });
                            self.current_node_view.setElement(self.$el.find(self.elements.text_area));

                            self.node_counter += 1;
                            self.current_node_view.render(self.node_counter);
                            self.scroll_bottom();

                            // update relations collection for new node and reset
                            self.relations_collection.set_parent_node(self.current_node);
                            self.relations_collection.set_search_text('');
                            self.relations_collection.fetch({
                                success: function() { self.relations_view.render_list(); },
                                error: function(col, resp) { self.add_error(resp); }
                            });

                            // clear prompt
                            self.$el.find(self.elements.prompt).val('').focus();

                        },
                        error: function(col, resp) { self.add_error(resp); }
                    }
                );
            },

            node_edit: function() {
                var self = this;
                this.current_node.fetch(
                    {
                        success: function() {
                            // create new nodeview and render (appends to text_area)
                            var node_edit = new NodeEditView({ node: self.current_node, forest_view: self });
                            node_edit.setElement('div#' + self.current_node_view.divid); // we will render over the top of the existing node view
                            node_edit.render();
                            self.scroll_bottom();

                            // clear out relations collection
                            self.relations_collection.reset();

                            // clear prompt
                            self.$el.find(self.elements.prompt).val('');

                            // redraw relations view
                            self.relations_view.render();
                        },
                        error: function(col, resp) { self.add_error(resp); }
                    }
                );
            }

        });
    }
);
