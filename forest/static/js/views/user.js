define(
    ['jquery', 'underscore', 'backbone', 'models/user', 'tpl!templates/user'],
    function($, _, Backbone, User, usertpl) {
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
                'user_form_result': 'div#user_form_result',
                'user_create_link': 'div#user_create',
                'user_create_form': 'div#user_create_form',
                'user_create_form_result': 'div#user_create_form_result',
                'user_create_save': 'button#user_create_form_save',
                'input_create_username': 'input[name=create_username]',
                'input_create_email': 'input[name=create_email]',
                'input_create_password': 'input[name=create_password]',
                'input_create_password_confirm': 'input[name=create_password_confirm]',
                'input_create_recaptcha_token': 'input[name=create_recaptcha_token]'
            },

            events: {
                'click button#login_button': 'click_login_button',
                'click button#user_form_save': 'user_form_save',
                'click button#user_create_form_save': 'click_user_create_form_save',
                'click div#user_create': 'click_user_create'
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

            click_user_create: function(evt) {
                var self = this;
                require(['//www.google.com/recaptcha/api.js?render=' + fglobals.recaptcha_site_key], function() {
                    grecaptcha.ready(function() {
                        grecaptcha
                            .execute(fglobals.recaptcha_site_key, { action: 'createuser' })
                            .then(function(token) {
                                self.$el.find(self.elements.input_create_recaptcha_token).val(token);
                            });
                    });
                });

                this.$el.find(this.elements.user_create_link).hide();
                this.$el.find(this.elements.user_create_form).css('display', 'inline-block');
            },

            click_user_create_form_save: function() {
                var self = this;

                var pass = this.$el.find(this.elements.input_create_password).val();
                var pass_confirm = this.$el.find(this.elements.input_create_password_confirm).val();

                if (pass != pass_confirm) {
                    self.set_user_create_form_result('<div class="error">Password fields must match.</div>');
                    return;
                }

                var new_user = new User({
                    username: this.$el.find(this.elements.input_create_username).val(),
                    email: this.$el.find(this.elements.input_create_email).val(),
                    password: this.$el.find(this.elements.input_create_password).val(),
                    recaptcha_token: this.$el.find(this.elements.input_create_recaptcha_token).val(),
                    ipaddr: fglobals.ipaddr,
                    new: true
                });

                new_user.save(
                    {},
                    {
                        success: function() {
                            self.set_user_create_form_result(
                                'Check your email for an activation email, and click the activation link within.');
                        },
                        error: function(err, resp) {
                            self.set_user_create_form_result(
                                '<div class="error">Error: ' + resp.responseText + '</div>');
                        }
                    });
            },

            set_user_create_form_result: function(text) {
                this.$el.find(this.elements.user_create_form_result).html(text);
            },

            set_login_error: function(err) {
                this.$el.find(this.elements.login_error).html('Login failed: ' + err).show();
            },

            update_csrf: function(user) {
                if (this.user.has('csrf_token')) {
                    fglobals.csrf_token = this.user.get('csrf_token');
                }
            },

            click_login_button: function() {
                var self = this;
                this.user.login({
                    username: this.$el.find(this.elements.username).val(),
                    password: this.$el.find(this.elements.password).val(),
                    success: function() {
                        self.user.set
                        self.update_csrf(self.user);
                        self.forest_view.statusbar_view.render();
                        self.forest_view.hide_divmodal();
                    },
                    failure: function(error) {
                        self.set_login_error(error);
                    }
                });
            },

            set_user_form_result: function(err) {
                this.$el.find(this.elements.user_form_result).html(err);
            },

            user_form_save: function() {
                var self = this;
                var passwd = this.$el.find(this.elements.chg_password).val();
                var passwd_confirm = this.$el.find(this.elements.chg_password_confirm).val();
                if (passwd && passwd != passwd_confirm) {
                    this.set_user_form_result('Passwords do not match');
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
                                self.update_csrf(self.user);
                                self.forest_view.hide_divmodal();
                                self.render();
                            },
                            error: function(err, resp) {
                                self.set_user_form_result('Failed to change password: ' + resp.statusText);
                            }
                        });
                }
            }
        });
    });
