define(
    ['jquery',
        'underscore',
        'backbone',
        'tpl!templates/model_selector_list'],
    function($, _, Backbone, modellisttpl) {

        return Backbone.View.extend({

            template: modellisttpl,

            events: {
                'click div.list_item': 'click_list'
            },

            initialize: function(options) {
                this.collection = options.collection;
                this.on_click_list_item = options.on_click_list_item;
            },

            render: function() {
                this.$el.html(this.template({ collection: this.collection }));
            },

            click_list: function(evt) {
                this.on_click_list_item($(evt.target).data('slug'));
            }

        });

    });
