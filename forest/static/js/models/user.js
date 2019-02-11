define(['backbone'], function(Backbone) {
    return Backbone.Model.extend({
        idAttribute: 'username',
        url: function() {
            return '/xhr/user';
        },

        logout: function(options) {
            var self = this;
            $.ajax({
                url: '/xhr/logout',
                dataType: 'json',
                success: function() {
                    self.unset('username');
                    options.success();
                },
                error: function(xhr, err, ex) { options.failure(xhr, err, ex) }
            });
        },

        login: function(options) {
            var self = this;
            $.ajax({
                url: '/xhr/login',
                dataType: 'json',
                method: 'POST',
                data: JSON.stringify({
                    username: options.username,
                    password: options.password
                }),
                success: function(ret) {
                    if (ret.success) {
                        self.set('username', options.username);
                        options.success(ret);
                    } else {
                        options.failure('Invalid login');
                    }
                },
                error: function(xhr, err, ex) {
                    options.failure(err);
                }
            });
        }



    });
});
