define(
    ['jquery', 'underscore', 'backbone', 'js/views/node', 'js/views/node_edit'],
    function($, _, Backbone, Node, NodeEdit) {
        return Backbone.Router.extend({
            routes: {
                "f/:node_slug": "node_view",
                "r/:relation_slug": "node_for_relation",
                "": "node_entry"
            },

            node_entry: function() {
                fglobals.forest.node_view('home');
            },
            node_view: function(node_slug) {
                fglobals.forest.node_view(node_slug);
            },
            node_for_relation: function(relation_slug) {
                fglobals.forest.node_view_for_relation(relation_slug);
            }
        });
    }
);
