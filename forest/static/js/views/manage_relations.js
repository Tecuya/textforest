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

            events: {
                'click tr': 'click_view_relation',
                'click span#manage_view_relation': 'click_view_relation',
                'click span#manage_edit_relation': 'click_edit_relation',
                'click span#manage_delete_relation': 'click_delete_relation'
            },

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
            },

            click_view_relation: function(evt) {

            },

            click_edit_relation: function(evt) {

            },

            click_delete_relation: function(evt) {
                evt.stopPropagation();

                var self = this;

                var slug = $(evt.target).closest('tr').data('slug').toString();

                if (!$(evt.target).hasClass('red')) {
                    $(evt.target).addClass('red');
                } else {

                    var relation = this.relations_collection.findWhere({ slug: slug });
                    relation.destroy({
                        wait: true,
                        success: function() {
                            self.relations_collection.remove(relation);
                            $(evt.target).closest('tr').hide();
                        },
                        error: function(xhr, resp) {
                            self.forest_view.add_error(resp.responseText);
                        }
                    });
                }
            }

        });
    });
