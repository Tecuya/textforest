define(['backbone'], function(Backbone) {

    return Backbone.Model.extend({
        idAttribute: 'slug',
        url: function() {
            if (this.get('slug')) {
                return '/xhr/node_by_slug/' + escape(this.get('slug'));
            } else if (this.get('relation_slug')) {
                return '/xhr/node_by_relation_slug/' + escape(this.get('relation_slug'));
            }
        }
    });

});
