define(
    ['jquery',
        'underscore',
        'backbone',
        'js/collections/relations',
        'tpl!templates/manage_relations'
    ],
    function($, _, Backbone, Relations, managerelationstpl) {
        return Backbone.View.extend({

            template: managerelationstpl,

            initialize: function(options) {
                this.manage_content_view = options.manage_content_view;
                this.forest_view = options.forest_view;

                this.relations_collection = new Relations({});
            },

            render: function() {

                var self = this;
                this.relations_collection.fetch(
                    {
                        success: function() {
                            self.$el.html(self.template({ relations: self.relations_collection }));
                            self.$el.find('table').DataTable();
                        },
                        error: function(xhr, err, ex) {
                            self.add_error('Relations fetch failed: ' + err.responseText);
                        }
                    });

                this.$el.html(this.template({}));
            }
        });
    });
