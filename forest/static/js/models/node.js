define(['backbone', 'js/models/item'], function(Backbone, Item) {

    return Backbone.Model.extend({

        idAttribute: 'slug',

        to_string: function() {
            return '"' + this.get('name') + '" created by ' + this.get('author') + ' ' + this.get('created');
        },

        url: function() {
            if (this.has('slug')) {
                return '/xhr/node_by_slug/' + escape(this.get('slug'));
            } else {
                if (this.get('direction') == 'backward') {
                    return '/xhr/node_by_backward_relation_slug/' + escape(this.get('relation_slug'));
                } else {
                    return '/xhr/node_by_forward_relation_slug/' + escape(this.get('relation_slug'));
                }
            }
        },

        subscribe: function(options) {
            var self = this;
            $.ajax({
                url: (options.subscribe ? '/xhr/subscribe/' : '/xhr/unsubscribe/') + this.get('slug'),
                dataType: 'json',
                success: function() {
                    self.set('subscribed', options.subscribe);
                    options.success();
                },
                error: function(xhr, err, ex) {
                    options.error(err.responseText);
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
