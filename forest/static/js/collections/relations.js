define(['backbone', 'js/models/relation'], function(Backbone, relation) {
    return Backbone.Collection.extend({

        model: relation,

        initialize: function(options) {
            this.sort = options.sort;
            this.sortdir = options.sortdir;
            this.sortpriop = options.sortpriop;
        },

        set_parent_node: function(node) {
            this.parent_node = node;
        },

        set_search_text: function(text) {
            this.text = text;
        },

        update_sort: function(sort, sortdir, sortpriop) {
            this.sort = sort;
            this.sortdir = sortdir;
            this.sortpriop = sortpriop;
        },

        url: function() {

            if (!this.parent_node) {
                return '/xhr/relations_for_user';

            } else {

                if (this.text) {
                    return '/xhr/relations/' + escape(this.parent_node.get('slug')) +
                        '/' + escape(this.text) + '?sort=' + this.sort + '&sortdir=' + this.sortdir + '&sortpriop=' + this.sortpriop;
                } else {
                    return '/xhr/relations/' + escape(this.parent_node.get('slug')) +
                        '?sort=' + this.sort + '&sortdir=' + this.sortdir + '&sortpriop=' + this.sortpriop;
                }
            }
        }
    });
});
