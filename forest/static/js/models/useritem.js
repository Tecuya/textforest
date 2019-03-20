define(['backbone', 'js/models/item'], function(Backbone, Item) {
    return Backbone.Model.extend({
        url: function() {
            return '/xhr/useritem_by_id/'+this.get('id');
        },
        parse: function(response) {
            response['item'] = Item.construct_from_json(response['item']);
            return response;
        }
    });
});
