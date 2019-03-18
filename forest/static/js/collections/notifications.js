define(['backbone', 'js/models/notification'], function(Backbone, notification) {
    return Backbone.Collection.extend({

        model: notification,

        url: function() {
            return '/xhr/notifications';
        }
    });
});
