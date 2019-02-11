define(
    ['jquery',
        'underscore',
        'backbone',
        'put_cursor_at_end',
        'models/node',
        'views/relations',
        'tpl!templates/node_edit'],
    function($, _, Backbone, put_cursor_at_end, Node, Relations, nodeedittpl) {

        return Backbone.View.extend({

            events: {
                'click button#save': 'save'
            },

            template: nodeedittpl,

            initialize: function(options) {
                this.node = options.node;
                this.forest_view = options.forest_view;
            },

            render: function() {
                this.$el.html(this.template({ node: this.node }));
                this.$el.scrollTop(this.$el[0].scrollHeight);
                this.$el.find('input[name=name]').focus();
            },

            error: function() {
                this.$el.append('Server error.... reload?');
            },

            save: function() {
                this.node.set('name', this.$el.find('input[name=name]').val());
                this.node.set('text', this.$el.find('textarea[name=text]').val());

                var self = this;
                this.node.on('sync', function() {
                    self.$el.hide();
                    self.forest_view.node_view(self.node.get('slug'));
                });

                this.node.save();
            }
        });
    }
);
