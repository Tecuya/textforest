define(['backbone', 'js/models/item'], function(Backbone, Item) {

    return Backbone.Model.extend({
        idAttribute: 'slug',
        url: function() {
            if (this.get('slug')) {
                return '/xhr/relation_by_slug/' + escape(this.get('slug'));
            } else {
                return '/xhr/create_relation';
            }
        },

        parse: function(response, options) {
            if (response['require_item']) {
                var i = response['require_item'];

                response['require_item'] = new Item({
                    name: i['name'],
                    slug: i['slug'],
                    author: i['author'],
                    created: i['created'],
                    owned: i['owned']
                });
            }
            return response;
        }
    });

});
