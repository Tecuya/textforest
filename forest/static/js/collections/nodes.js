define(['backbone', 'js/models/node'], function(Backbone, node) {
    return Backbone.Collection.extend({
        model: node,

        url: function() {
            if (this.text) {
                return '/xhr/nodes_for_text/' + escape(this.text);
            }

            return '/xhr/nodes_for_user';
        },

        set_search_text: function(text) {
            this.text = text;
        }
    });
});
