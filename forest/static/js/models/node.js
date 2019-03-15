define(['backbone'], function(Backbone) {

    return Backbone.Model.extend({

        idAttribute: 'slug',

        to_string: function() {
            return '"' + this.get('name') + '" created by ' + this.get('author') + ' ' + this.get('created');
        },

        url: function() {
            if (this.get('slug')) {
                return '/xhr/node_by_slug/' + escape(this.get('slug'));
            } else {
                if (this.get('direction') == 'backwards') {
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
        }
    });

});
