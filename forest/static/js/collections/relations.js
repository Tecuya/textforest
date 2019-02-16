define(['backbone', 'models/relation'], function(Backbone, relation) {
    return Backbone.Collection.extend({
        model: relation,
        initialize: function(options) {
            this.sort = options.sort;
            this.sortdir = options.sortdir;
        },

        set_parent_node: function(node) {
            this.parent_node = node;
        },

        set_search_text: function(text) {
            this.text = text;
        },

        update_sort: function(sort, sortdir) {
            this.sort = sort;
            this.sortdir = sortdir;
        },

        url: function() {
            if (this.text) {
                return '/xhr/relations/' + this.parent_node.get('slug') + '/' + this.text + '?sort=' + this.sort + '&sortdir=' + this.sortdir;
            } else {
                return '/xhr/relations/' + this.parent_node.get('slug') + '?sort=' + this.sort + '&sortdir=' + this.sortdir;;
            }
        }
    });
});
