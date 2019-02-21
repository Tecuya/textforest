define(['backbone'], function(Backbone) {

    return Backbone.Model.extend({

        idAttribute: 'slug',

        url: function() {
            if (this.get('slug')) {
                return '/xhr/node_by_slug/' + escape(this.get('slug'));
            } else {
                // if (this.get('relation_slug')) {
                return '/xhr/node_by_relation_slug/' + escape(this.get('relation_slug'));
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
