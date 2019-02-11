define(['backbone', 'models/relation'], function(Backbone, relation) {
    return Backbone.Collection.extend({
        model: relation,
        initialize: function() { },

        set_parent_node: function(node) {
            this.parent_node = node;
        },

        set_search_text: function(text) {
            this.text = text;
        },

        url: function() {
            if (this.text) {
                return '/xhr/relations/' + this.parent_node.get('slug') + '/' + this.text;
            } else {
                return '/xhr/relations/' + this.parent_node.get('slug');
            }
        }
    });
});
