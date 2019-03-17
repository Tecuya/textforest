define(['backbone', 'models/item'], function(Backbone, Item) {
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
                error: function(xhr, err, ex) {
                    options.failure(xhr, err, ex);
                }
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
                        self.set('csrf_token', ret.csrf_token);
                        options.success(ret);
                    } else {
                        options.failure('Invalid login');
                    }
                },
                error: function(xhr, err, ex) {
                    options.failure(err);
                }
            });
        },

        parse: function(response, options) {
            // convert the json items in to item models
            var items = [];
            _.each(response['items'], function(i, idx) {
                items.push(
                    new Item(
                        {
                            name: i['name'],
                            slug: i['slug'],
                            author: i['author'],
                            created: i['created'],
                            owned: i['owned']
                        }));
            });

            response['items'] = items;
            return response;
        }

    });
});
