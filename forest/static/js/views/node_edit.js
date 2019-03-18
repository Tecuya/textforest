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

            elements: {
                'name_input': 'input#node_name_input',
                'text_textarea': 'textarea#node_text_textarea',
                'backward_relation_checkbox': 'input#node_show_backward_relations_checkbox',
                'public_can_link_checkbox': 'input#node_public_can_link_checkbox'
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

                this.$el.find(this.elements.name_input).val(this.node.get('name')).focus();
                this.$el.find(this.elements.text_textarea).val(this.node.get('text'));
                this.$el.find(this.elements.backward_relation_checkbox).prop('checked', this.node.get('show_backward_relations'));
                this.$el.find(this.elements.public_can_link_checkbox).prop('checked', this.node.get('public_can_link'));
            },

            cancel: function() {
                this.forest_view.hide_divmodal();
            },

            preview: function(evt) {

                var previewb = $(evt.target);
                var textarea = this.$el.find(this.elements.text_textarea);
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
                this.node.set('name', this.$el.find(this.elements.name_input).val());
                this.node.set('text', this.$el.find(this.elements.text_textarea).val());
                this.node.set('show_backward_relations', this.$el.find(this.elements.backward_relation_checkbox).is(':checked'));
                this.node.set('public_can_link', this.$el.find(this.elements.public_can_link_checkbox).is(':checked'));

                var self = this;
                this.node.save(
                    {},
                    {
                        success: function() {
                            self.forest_view.manage_content_view.manage_nodes_view.render();
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
