define(['backbone'], function(Backbone) {

    return Backbone.Model.extend({
        idAttribute: 'slug',
        url: function() {
            return '/xhr/node_by_slug/' + this.get('slug');
        }
    });

});
