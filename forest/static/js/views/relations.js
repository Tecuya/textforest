define(
    ['jquery',
        'underscore',
        'backbone',
        'util/fetch_completions',
        'views/node_list',
        'views/relations_list',
        'models/relation',
        'collections/relations',
        'tpl!templates/relations'],
    function($, _, Backbone, fetch_completions, NodeList, RelationsList, Relation, Relations, relationstpl) {
        return Backbone.View.extend({

            template: relationstpl,

            initialize: function(options) {
                this.forest_view = options.forest_view;
                this.relations_list_view = new RelationsList({ forest_view: this.forest_view, relations_view: this });
            },

            set_relations_collection: function(relations_collection) {
                this.relations_collection = relations_collection;
            },

            render: function() {
                this.$el.html(this.template());
                this.relations_list_view.setElement('div#relations_list');
            },

            render_list: function() {
                this.relations_list_view.render(this.relations_collection);
            }

        });
    }
);
