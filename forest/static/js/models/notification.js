define(['backbone'], function(Backbone) {
    return Backbone.Model.extend({
        idAttribute: 'id',
        url: function() {
            return '/xhr/notification/' + this.get('id');
        }
    });
});
