define(
    ['jquery',
        'underscore',
        'backbone',
        'showdown',
        'put_cursor_at_end',
        'js/models/relation',
        'tpl!templates/relation_edit'],
    function($, _, Backbone, showdown, put_cursor_at_end, Relation, relationedittpl) {

        return Backbone.View.extend({

            elements: {
                'preview': 'div#editpreview'
            },

            events: {
                'click button#relation_edit_save': 'save',
                'click button#relation_edit_preview': 'preview',
                'click button#relation_edit_cancel': 'cancel'
            },

            template: relationedittpl,

            initialize: function(options) {
                this.forest_view = options.forest_view;
            },

            set_relation: function(relation) {
                this.relation = relation;
            },

            render: function() {
                this.$el.html(this.template({ relation: this.relation }));
            },

            cancel: function() {
                this.forest_view.hide_divmodal();
            },

            preview: function(evt) {

                var previewb = $(evt.target);
                var textarea = this.$el.find('textarea[name=text]');
                var previewdiv = this.$el.find(this.elements.preview);

                if (previewb.html() == 'Preview') {
                    textarea.hide();
                    var converter = new showdown.Converter();
                    var edit_contents = converter.makeHtml(textarea.val().replace(/<\/?[^>]+(>|$)/g, ""));
                    previewdiv.html(edit_contents).show();
                    previewb.html('Edit');

                } else {
                    textarea.show();
                    previewdiv.hide();
                    previewb.html('Preview');
                }
            },

            save: function() {
                this.relation.set('name', this.$el.find('input[name=name]').val());
                this.relation.set('text', this.$el.find('textarea[name=text]').val());

                var self = this;
                this.relation.save(
                    {},
                    {
                        success: function() {
                            self.forest_view.manage_content_view.manage_relations_view.render();
                            self.forest_view.hide_divmodal();
                        },
                        error: function(xhr, resp) {
                            self.forest_view.add_error(resp.responseText);
                        }
                    });
            }
        });
    }
);
