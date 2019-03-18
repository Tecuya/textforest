define(
    ['jquery',
        'underscore',
        'backbone',
        'showdown',
        'put_cursor_at_end',
        'js/models/node',
        'tpl!templates/node_edit'],
    function($, _, Backbone, showdown, put_cursor_at_end, Node, nodeedittpl) {

        return Backbone.View.extend({

            elements: {
                'preview': 'div#editpreview'
            },

            events: {
                'click button#node_edit_save': 'save',
                'click button#node_edit_preview': 'preview',
                'click button#node_edit_cancel': 'cancel'
            },

            template: nodeedittpl,

            initialize: function(options) {
                this.forest_view = options.forest_view;
            },

            set_node: function(node) {
                this.node = node;
            },

            render: function() {
                this.$el.html(this.template({ node: this.node }));
                this.$el.find('input[name=name]').focus();
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
                this.node.set('name', this.$el.find('input[name=name]').val());
                this.node.set('text', this.$el.find('textarea[name=text]').val());

                var self = this;
                this.node.save(
                    {},
                    {
                        success: function() {
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
