define(
    ['jquery', 'underscore', 'backbone', 'tpl!templates/user'],
    function($, _, Backbone, usertpl) {
        return Backbone.View.extend({
            template: usertpl,

            elements: {
                'login_error': 'div#login_error',
                'username': 'input[name=username]',
                'password': 'input[name=password]'
            },

            events: {
                'click button#login_button': 'click_login_button'
            },

            initialize: function(options) {
                this.forest_view = options.forest_view;
                this.user = options.user;
            },

            render: function() {
                this.$el.html(
                    this.template({
                        user: this.user,
                        social_oauth_links: fglobals.social_oauth_links
                    })
                );
            },

            set_error: function(err) {
                this.$el.find(this.elements.login_error).html('Login failed: ' + err).show();
            },

            click_login_button: function() {
                var self = this;
                this.user.login({
                    username: this.$el.find(this.elements.username).val(),
                    password: this.$el.find(this.elements.password).val(),
                    success: function() {
                        self.forest_view.statusbar_view.render();
                        self.forest_view.hide_divmodal();
                    },
                    failure: function(error) {
                        self.set_error(error);
                    }
                });
            }
        });
    });
