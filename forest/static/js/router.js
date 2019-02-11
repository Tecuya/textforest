define(
    ['jquery', 'underscore', 'backbone', 'views/node', 'views/node_edit'],
    function($, _, Backbone, Node, NodeEdit) {
        return Backbone.Router.extend({
            routes: {
                "f/:slug": "node_view",
                "": "node_entry"
            },

            node_entry: function() {
                fglobals.forest.node_view('_');
            },
            node_view: function(slug) {
                fglobals.forest.node_view(slug);
            }
        });
    }
);
