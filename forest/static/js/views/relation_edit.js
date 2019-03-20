define(
    ['jquery',
        'underscore',
        'backbone',
        'showdown',
        'put_cursor_at_end',
        'js/models/relation',
        'js/models/relationitem',
        'js/views/node_selector',
        'js/views/relationitem_edit',
        'tpl!templates/relation_edit'],
    function($, _, Backbone, showdown, put_cursor_at_end, Relation, RelationItem, NodeSelector, RelationItemEdit, relationedittpl) {

        return Backbone.View.extend({

            elements: {
                'preview': 'div#editpreview'
            },

            events: {
                'click button#relation_edit_save': 'save',
                'click button#relation_edit_preview': 'preview',
                'click button#relation_edit_cancel': 'cancel',
                'click div#relation_edit_create_item_interaction': 'click_add_item_interaction'
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

            // create_relation_with_initial_vals: function(source_slug, initial_text) {
            //     this.relation = new Relation({
            //         parent: source_slug,
            //         text: initial_text
            //     });
            // },

            render: function(mode, inline_options) {
                var self = this;

                this.$el.html(this.template({
                    mode: mode,
                    relation: this.relation,
                    inline_options: inline_options
                }));

                if (inline_options) {
                    if (inline_options.initial_slug) {
                        this.relation = new Relation();
                        this.node_selector_source.prime_from_slug(inline_options.initial_slug);
                    }
                    if (inline_options.initial_name) {
                        this.$el.find('input#relation_edit_text').val(inline_options.initial_name);
                        this.relation.set('text', inline_options.initial_name);
                    }
                    this.callback_on_save = inline_options.callback_on_save;
                }

                this.node_selector_source.setElement(this.$el.find('div#relation_node_select_source'));
                this.node_selector_source.inline_create_options = {
                    title: 'Create Source Node for Relation: "' + this.relation.get('text') + '"',
                    return_to_divmodal: this.forest_view.elements.divmodal_relation_edit
                };
                this.node_selector_source.render();

                this.node_selector_dest.setElement(this.$el.find('div#relation_node_select_dest'));
                this.node_selector_dest.inline_create_options = {
                    title: 'Create Destination Node for ' + (this.relation ? ('Relation: "' + this.relation.get('text') + '"') : 'New Relation'),
                    return_to_divmodal: this.forest_view.elements.divmodal_relation_edit
                };
                this.node_selector_dest.render();

                // we can rely on these being present from create_relation_with_initial_vals

                if (mode == 'edit' && this.relation) {
                    this.$el.find('input#relation_edit_text').val(this.relation.get('text'));
                    this.$el.find('input#relation_edit_only_discoverable_via_ac_x_chars').val(this.relation.get('only_discoverable_via_ac_x_chars'));
                    this.$el.find('input#relation_edit_repeatable').prop('checked', this.relation.get('repeatable'));
                    this.$el.find('input#relation_edit_hide_when_requirements_unmet').prop('checked', this.relation.get('hide_when_requirements_unmet'));
                    this.$el.find('input#relation_edit_only_visible_to_node_owner').prop('checked', this.relation.get('only_visible_to_node_owner'));

                    this.node_selector_source.prime_from_slug(this.relation.get('parent'));
                    this.node_selector_dest.prime_from_slug(this.relation.get('child'));

                    _.each(this.relation.get('relationitems'), function(relationitem, idx) {
                        self.add_item_interaction(relationitem);
                    });

                } else {
                    this.$el.find('input#relation_edit_only_discoverable_via_ac_x_chars').val('0');
                }

                this.$el.find('input#relation_edit_text').focus();
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

                if (!this.relation) {
                    this.relation = new Relation();
                }

                this.relation.set('text', this.$el.find('input#relation_edit_text').val());
                this.relation.set('parent', this.node_selector_source.get_selected_model().get('slug'));

                // child is optional
                var selected_child = this.node_selector_dest.get_selected_model();
                if (selected_child) {
                    this.relation.set('child', this.node_selector_dest.get_selected_model().get('slug'));
                }

                this.relation.set('only_discoverable_via_ac_x_chars', this.$el.find('input#relation_edit_only_discoverable_via_ac_x_chars').val());
                this.relation.set('repeatable', this.$el.find('input#relation_edit_repeatable').prop('checked'));
                this.relation.set('hide_when_requirements_unmet', this.$el.find('input#relation_edit_hide_when_requirements_unmet').prop('checked'));
                this.relation.set('only_visible_to_node_owner', this.$el.find('input#relation_edit_only_visible_to_node_owner').prop('checked'));

                var relationitems = [];
                this.$el
                    .find('div.relation_edit_item_interaction')
                    .each(
                    function() {
                        var i = $(this);
                        var interaction = i.find('select#relationitem_action_select').val();
                        var quantity = i.find('input#relationitem_qty_input').val();
                        var item = i.find('div.model_selector_selection').data('slug');

                        if (interaction && quantity && item) {
                            relationitems.push(new RelationItem({ interaction: interaction, quantity: quantity, item: item }));
                        }
                    });
                this.relation.set('relationitems', relationitems);

                var self = this;
                this.relation.save(
                    {},
                    {
                        success: function() {

                            if(self.forest_view.relations_collection.findWhere({slug: self.relation.get('slug')})) {
                                self.forest_view.choices_view.render();
                            }

                            if (self.callback_on_save) {
                                self.callback_on_save(self.relation);
                            } else {
                                self.forest_view.manage_content_view.manage_relations_view.render();
                                self.forest_view.hide_divmodal();
                            }
                        },
                        error: function(xhr, resp) {
                            self.forest_view.add_error(resp.responseText);
                        }
                    });
            },

            click_add_item_interaction: function(evt) {
                this.add_item_interaction();
            },

            add_item_interaction: function(relationitem) {
                var ri_div = $(document.createElement('div')).addClass('relation_edit_item_interaction');
                var relationitem_edit = new RelationItemEdit({ forest_view: this.forest_view, relation_edit_view: this, relationitem: relationitem });
                relationitem_edit.setElement(ri_div);
                relationitem_edit.render(relationitem ? 'edit' : 'create');

                this.$el.find('div#relation_edit_item_interactions').append(ri_div);
            }
        });
    }
);
