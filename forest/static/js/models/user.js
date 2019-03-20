define(['backbone', 'js/models/item', 'js/models/useritem'], function(Backbone, Item, UserItem) {
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
            var useritems = [];
            _.each(response['items'], function(ui, idx) {
                useritems.push(new UserItem(
                    {
                        id: ui['id'],
                        item: Item.construct_from_json(ui['item']),
                        quantity: ui['quantity'],
                        created: ui['created']
                    }));
            });

            response['items'] = useritems;
            return response;
        }

    });
});
