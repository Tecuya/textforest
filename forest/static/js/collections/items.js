define(['backbone', 'js/models/item'], function(Backbone, item) {
    return Backbone.Collection.extend({
        model: item,

        url: function() {
            if (this.text) {
                return '/xhr/items_for_text/' + escape(this.text);
            } else {
                return '/xhr/items_for_user';
            }
        }
    });
});
