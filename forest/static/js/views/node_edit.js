define(
    ['jquery',
        'underscore',
        'backbone',
        'showdown',
        'put_cursor_at_end',
        'models/node',
        'views/relations',
        'tpl!templates/node_edit'],
    function($, _, Backbone, showdown, put_cursor_at_end, Node, Relations, nodeedittpl) {

        return Backbone.View.extend({

            elements: {
                'preview': 'div#editpreview'
            },

            events: {
                'click button#save': 'save',
                'click button#preview': 'preview',
                'click button#cancel': 'cancel'
            },

            template: nodeedittpl,

            initialize: function(options) {
                this.node = options.node;
                this.forest_view = options.forest_view;
            },

            render: function() {
                this.$el.html(this.template({ node: this.node }));
                this.$el.find('input[name=name]').focus();
            },

            error: function() {
                this.$el.append('Server error.... reload?');
            },

            cancel: function() {
                this.leave_editor();
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

            leave_editor: function() {
                this.$el.remove();
                this.forest_view.node_view(this.node.get('slug'));
            },

            save: function() {
                this.node.set('name', this.$el.find('input[name=name]').val());
                this.node.set('text', this.$el.find('textarea[name=text]').val());

                var self = this;
                this.node.on('sync', function() { self.leave_editor(); });

                this.node.save();
            }
        });
    }
);
