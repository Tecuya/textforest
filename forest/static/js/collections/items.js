define(['backbone', 'models/item'], function(Backbone, item) {
    return Backbone.Collection.extend({
        model: item,

        url: function() {
            return '/xhr/items_for_text/' + escape(this.text);
        }
    });
});
