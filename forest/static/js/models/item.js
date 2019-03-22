define(['backbone'], function(Backbone) {

    var Item = Backbone.Model.extend(
        {
            idAttribute: 'slug',

            to_string: function() {
                return '"' + this.get('name') + '" by ' + this.get('author') + ' ' + this.get('created');
            },

            url: function() {
                if (this.has('slug')) {
                    return '/xhr/item_by_slug/' + escape(this.get('slug'));
                } else {
                    return '/xhr/item_by_slug';
                }
            }
        },
        {
            construct_from_json(itemjson) {
                return new Item({
                    name: itemjson['name'],
                    slug: itemjson['slug'],
                    author: itemjson['author'],
                    description_node: itemjson['description_node'],
                    max_quantity: itemjson['max_quantity'],
                    droppable: itemjson['droppable'],
                    public_can_link: itemjson['public_can_link'],
                    created: itemjson['created']
                });
            }
        }
    );

    return Item;

});
