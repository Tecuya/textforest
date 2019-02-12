define(
    ['jquery', 'underscore', 'backbone', 'tpl!templates/user'],
    function($, _, Backbone, usertpl) {
        return Backbone.View.extend({
            template: usertpl,

            elements: {
                'login_error': 'div#login_error',
                'username': 'input[name=username]',
                'password': 'input[name=password]',
                'user_form_save': 'button#user_form_save',
                'chg_password': 'input[name=chg_password]',
                'chg_password_confirm': 'input[name=chg_password_confirm]',
                'input_first_name': 'input[name=first_name]',
                'input_last_name': 'input[name=last_name]',
                'input_email': 'input[name=email]',
                'password_change_form_result': 'div#password_change_form_result'
            },

            events: {
                'click button#login_button': 'click_login_button',
                'click button#user_form_save': 'user_form_save'
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

            set_login_error: function(err) {
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
                        self.set_login_error(error);
                    }
                });
            },

            set_usersave_error: function(err) {
                this.$el.find(this.elements.usersaveresult).html(err);
            },

            user_form_save: function() {
                var self = this;
                var passwd = this.$el.find(this.elements.chg_password).val();
                var passwd_confirm = this.$el.find(this.elements.chg_password_confirm).val();
                if (passwd && passwd != passwd_confirm) {
                    this.set_password_error('Passwords do not match.');
                } else {
                    if (passwd) {
                        this.user.set('password', passwd);
                    }

                    this.user.set('first_name', this.$el.find(this.elements.input_first_name).val());
                    this.user.set('last_name', this.$el.find(this.elements.input_last_name).val());
                    this.user.set('email', this.$el.find(this.elements.input_email).val());

                    this.user.save(
                        {},
                        {
                            success: function() {
                                // server may send us new csrf token
                                if (self.user.has('csrf_token')) {
                                    fglobals.csrf_token = self.user.get('csrf_token');
                                }
                                self.forest_view.hide_divmodal();
                                self.render();
                            },
                            error: function(err, resp) {
                                self.set_usersave_error('Failed to change password: ' + resp.statusText);
                            }
                        });
                }
            }
        });
    });
