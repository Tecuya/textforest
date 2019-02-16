define(['backbone'], function(Backbone) {

    return Backbone.Model.extend({
        idAttribute: 'slug',
        url: function() {
            if (this.get('slug')) {
                return '/xhr/delete_relation/' + escape(this.get('slug'));
            } else {
                return '/xhr/create_relation';
            }
        }
    });

});
