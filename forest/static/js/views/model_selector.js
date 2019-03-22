define(
    ['jquery',
        'underscore',
        'backbone',
        'put_cursor_at_end',
        'js/views/model_selector_list',
        'js/util/fetch_completions',
        'tpl!templates/model_selector'],

    function($, _, Backbone, put_cursor_at_end, ModelSelectorList, fetch_completions, modelselectortpl) {
        return Backbone.View.extend({

            elements: {
                'input': 'input.model_selector_input',

                'selection_input_div': 'div.model_selector_input_div',
                'selection_div': 'div.model_selector_selection',

                'model_selector_list': 'div.model_selector_list'
            },

            events: {
                'keyup input.model_selector_input': 'keyup_model_input',
                'click div.model_selector_selection': 'click_change_selection'
            },

            template: modelselectortpl,

            initialize: function(options) {
                var self = this;
                this.forest_view = options.forest_view;
                this.collection = options.collection;

                this.model_selector_list_view = new ModelSelectorList({
                    collection: this.collection,
                    on_click_list_item: function(slug) { self.click_list_item(slug); }
                });
                this.selected_node = undefined;
            },

            render: function() {
                this.$el.html(this.template({}));
                this.model_selector_list_view.setElement(this.$el.find(this.elements.model_selector_list));
            },

            keyup_model_input: function() {
                var self = this;

                fetch_completions({
                    lastfetch: self.lastfetch,
                    refresh: function() {
                        var input_contents = self.$el.find(self.elements.input).val();

                        if (input_contents.length < 2) {
                            self.$el.find(self.elements.model_selector_list).hide();
                            return;
                        }

                        self.lastfetch = new Date().getTime();
                        self.collection.set_search_text(input_contents);

                        self.collection.fetch({
                            success: function() {
                                // they already made a selection so dont interrupt
                                if (self.$el.find(self.elements.selection_div).is(':visible')) {
                                    return;
                                }
                                self.$el.find(self.elements.model_selector_list).show();
                                self.model_selector_list_view.render();
                            },
                            error: function(col, err) { self.forest_view.add_error(err.responseText); }
                        });
                    },
                    expedite_condition: function() {
                        return self.$el.find(self.elements.input).val().length < 2;
                    }
                });
            },

            click_list_item: function(slug) {
                var self = this;

                if (slug) {
                    this.select_model(this.collection.findWhere({ 'slug': slug }));
                } else {
                    this.$el.find(this.elements.model_selector_list).hide();

                    Object.assign(
                        this.inline_create_options,
                        {
                            callback_on_save: function(created_model) { self.select_model(created_model); },
                            initial_name: this.$el.find(this.elements.input).val()
                        }
                    );

                    this.perform_creation(this.inline_create_options);
                }
            },

            select_model: function(model) {
                this.selected_model = model;

                this.$el.find(this.elements.selection_input_div).hide();
                this.$el.find(this.elements.model_selector_list).hide();
                this.$el.find(this.elements.selection_div).html(model.to_string()).data('slug', model.get('slug')).show();
            },

            click_change_selection: function() {

                this.selected_model = undefined;

                this.$el.find(this.elements.selection_input_div).show();
                this.$el.find(this.elements.model_selector_list).show();
                this.$el.find(this.elements.selection_div).hide();

                this.$el.find(this.elements.input).putCursorAtEnd().focus();
                this.keyup_model_input();

            },

            get_selected_model: function() {
                return this.selected_model;
            }
        });
    }
);
