define(
    ['jquery',
        'underscore',
        'backbone',
        'showdown',
        'put_cursor_at_end',
        'js/models/item',
        'tpl!templates/item_edit'],
    function($, _, Backbone, showdown, put_cursor_at_end, Item, itemedittpl) {

        return Backbone.View.extend({

            elements: {
                'preview': 'div#editpreview'
            },

            events: {
                'click button#item_edit_save': 'save',
                'click button#item_edit_preview': 'preview',
                'click button#item_edit_cancel': 'cancel'
            },

            template: itemedittpl,

            initialize: function(options) {
                this.forest_view = options.forest_view;
            },

            set_item: function(item) {
                this.item = item;
            },

            render: function() {
                this.$el.html(this.template({ item: this.item }));
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
                this.item.set('name', this.$el.find('input[name=name]').val());
                this.item.set('text', this.$el.find('textarea[name=text]').val());

                var self = this;
                this.item.save(
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
