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

        filtered_for_user: function(user) {
            var filtered = [];

            _.each(this.models, function(relation, idx) {
                var allow = true;

                if(relation.get('direction') == 'forward' && relation.get('hide_when_requirements_unmet')) { 
                    _.each(relation.get('relationitems'), function(ri, idx) {
                        if(ri.get('interaction') == 'require' || ri.get('interaction') == 'consume') {
                            
                            var useritems = _.filter(
                                user.get('items'),
                                function(useritem) {
                                    return useritem.get('item').get('slug') == ri.get('item').get('slug');
                                });

                            if(useritems.length == 0) {
                                allow=false;
                            } else if(useritems[0].get('quantity') < ri.get('quantity')) {
                                allow=false;
                            }
                            
                        }
                    });
                }

                if(allow) {
                    filtered.push(relation);
                }
            });
            
            return filtered;
        },
        
        url: function() {

            if (!this.parent_node) {
                return '/xhr/relations_for_user';

            } else {

                if (this.text) {
                    return '/xhr/relations_for_node_slug/' + escape(this.parent_node.get('slug')) +
                        '/' + escape(this.text) + '?sort=' + this.sort + '&sortdir=' + this.sortdir + '&sortpriop=' + this.sortpriop;
                } else {
                    return '/xhr/relations_for_node_slug/' + escape(this.parent_node.get('slug')) +
                        '?sort=' + this.sort + '&sortdir=' + this.sortdir + '&sortpriop=' + this.sortpriop;
                }
            }
        }
    });
});
