define(['backbone', 'js/models/relationitem'], function(Backbone, RelationItem) {

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
            var relationitems = [];
            _.each(response['relationitems'], function(relationitem, idx) {
                relationitems.push(
                    new RelationItem(
                        {
                            interaction: relationitem['interaction'],
                            quantity: relationitem['quantity'],
                            item: relationitem['item']
                        })
                );
            });

            response['relationitems'] = relationitems;
            return response;
        }
    });

});
