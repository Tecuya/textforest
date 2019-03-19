define(
    ['jquery',
        'underscore',
        'backbone',
        'showdown',
        'put_cursor_at_end',
        'js/models/relation',
        'js/views/node_selector',
        'tpl!templates/relation_edit'],
    function($, _, Backbone, showdown, put_cursor_at_end, Relation, NodeSelector, relationedittpl) {

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

                this.node_selector_source = new NodeSelector({ forest_view: this.forest_view });
                this.node_selector_dest = new NodeSelector({ forest_view: this.forest_view });
            },

            set_relation: function(relation) {
                this.relation = relation;
            },

            render: function() {
                this.$el.html(this.template({ relation: this.relation }));

                this.$el.find('input#relation_edit_text').val(this.relation.get('text'));

                this.node_selector_source.setElement(this.$el.find('div#relation_node_select_source'));
                this.node_selector_source.inline_create_options = {
                    title: 'Create Source Node for Relation: "' + this.relation.get('text') + '"',
                    return_to_divmodal: this.forest_view.elements.divmodal_relation_edit
                };
                this.node_selector_source.render();
                this.node_selector_source.prime_from_slug(this.relation.get('parent'));

                this.node_selector_dest.setElement(this.$el.find('div#relation_node_select_dest'));
                this.node_selector_dest.inline_create_options = {
                    title: 'Create Destination Node for Relation: "' + this.relation.get('text') + '"',
                    return_to_divmodal: this.forest_view.elements.divmodal_relation_edit
                };
                this.node_selector_dest.render();
                this.node_selector_dest.prime_from_slug(this.relation.get('child'));

                this.$el.find('input#relation_edit_only_discoverable_via_ac_x_chars').val(this.relation.get('only_discoverable_via_ac_x_chars'));
                this.$el.find('input#relation_edit_repeatable').prop('checked', this.relation.get('repeatable'));
                this.$el.find('input#relation_edit_hide_when_requirements_unmet').prop('checked', this.relation.get('hide_when_requirements_unmet'));
                this.$el.find('input#relation_edit_only_visible_to_node_owner').prop('checked', this.relation.get('only_visible_to_node_owner'));
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
                this.relation.set('text', this.$el.find('input#relation_edit_text').val());
                this.relation.set('parent', this.node_selector_source.get_selected_node().get('slug'));
                this.relation.set('child', this.node_selector_dest.get_selected_node().get('slug'));
                this.relation.set('only_discoverable_via_ac_x_chars', this.$el.find('input#relation_edit_only_discoverable_via_ac_x_chars').val());
                this.relation.set('repeatable', this.$el.find('input#relation_edit_repeatable').val());
                this.relation.set('hide_when_requirements_unmet', this.$el.find('input#relation_edit_hide_when_requirements_unmet').val());
                this.relation.set('only_visible_to_node_owner', this.$el.find('input#relation_edit_only_visible_to_node_owner').val());

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
