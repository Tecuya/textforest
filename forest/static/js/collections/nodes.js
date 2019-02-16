define(['backbone', 'models/node'], function(Backbone, node) {
    return Backbone.Collection.extend({
        model: node,

        url: function() {
            return '/xhr/nodes_for_text/' + escape(this.text);
        }
    });
});
