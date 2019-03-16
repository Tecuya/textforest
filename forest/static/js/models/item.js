define(['backbone'], function(Backbone) {

    return Backbone.Model.extend({
        idAttribute: 'slug',

        to_string: function() {
            return '"' + this.get('name') + '" created by ' + this.get('author') + ' ' + this.get('created');
        },

        url: function() {
            if (this.has('slug')) {
                return '/xhr/item_by_slug/' + escape(this.get('slug'));
            } else {
                return '/xhr/item_by_slug';
            }
        }
    });

});
