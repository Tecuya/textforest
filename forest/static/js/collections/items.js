define(['backbone', 'js/models/item'], function(Backbone, item) {
    return Backbone.Collection.extend({
        model: item,

        url: function() {
            if (this.text) {
                return '/xhr/items_for_text?text=' + encodeURIComponent(this.text);
            }

            return '/xhr/items_for_user';
        },

        set_search_text: function(text) {
            this.text = text;
        }
    });
});
