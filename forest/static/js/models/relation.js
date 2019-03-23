define(['backbone', 'js/models/relationitem', 'js/models/item'], function(Backbone, RelationItem, Item) {

    return Backbone.Model.extend({
        idAttribute: 'slug',
        url: function() {
            if (this.get('slug')) {
                return '/xhr/relation_by_slug/' + encodeURI(this.get('slug'));
            } else {
                return '/xhr/relation_by_slug';
            }
        },

        parse: function(response, options) {
            var relationitems = [];
            _.each(response['relationitems'], function(relationitem, idx) {
                relationitems.push(
                    new RelationItem(
                        {
                            interaction: relationitem['interaction'],
                            quantity: relationitem['quantity'],
                            item: Item.construct_from_json(relationitem['item']),
                            hide: relationitem['hide']
                        })
                );
            });

            response['relationitems'] = relationitems;
            return response;
        }
    });

});
