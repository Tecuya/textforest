define(
    ['jquery',
        'underscore',
        'backbone',
        'js/views/manage_nodes',
        'js/views/manage_relations',
        'js/views/manage_items',
        'tpl!templates/manage_content'],

    function($, _, Backbone, ManageNodesView, ManageRelationsView, ManageItemsView, managecontenttpl) {
        return Backbone.View.extend({

            template: managecontenttpl,

            events: {
                'click div.drawer_close_button': 'close_manage_content',
                'click div.drawer_tab': 'click_drawer_tab'
            },

            initialize: function(options) {
                this.forest_view = options.forest_view;
                this.manage_nodes_view = new ManageNodesView({ forest_view: this.forest_view, manage_content_view: this });
                this.manage_relations_view = new ManageRelationsView({ forest_view: this.forest_view, manage_content_view: this });
                this.manage_items_view = new ManageItemsView({ forest_view: this.forest_view, manage_content_view: this });
            },

            render: function() {
                if (!this.forest_view.user.has('username')) {
                    return;
                }

                this.$el.html(this.template({}));
                this.manage_nodes_view.setElement(this.$el.find('div#nodes_tab_area'));
                this.manage_relations_view.setElement(this.$el.find('div#relations_tab_area'));
                this.manage_items_view.setElement(this.$el.find('div#items_tab_area'));

                this.select_tab('nodes');
            },

            click_drawer_tab: function(evt) {
                this.select_tab($(evt.target).data('tab'));
            },

            tab_content_map: function() {
                return {
                    'nodes': ['div#nodes_tab', 'div#nodes_tab_area', this.manage_nodes_view],
                    'relations': ['div#relations_tab', 'div#relations_tab_area', this.manage_relations_view],
                    'items': ['div#items_tab', 'div#items_tab_area', this.manage_items_view]
                };
            },

            select_tab: function(tab) {
                var self = this;

                var when_done_render_view;
                _.each(this.tab_content_map(), function(tabdata, key) {
                    if (key == tab) {
                        self.$el.find(tabdata[0]).addClass('drawer_tab_active');
                        self.$el.find(tabdata[1]).show();
                        when_done_render_view = tabdata[2];
                    } else {
                        self.$el.find(tabdata[0]).removeClass('drawer_tab_active');
                        self.$el.find(tabdata[1]).hide();
                    }
                });

                if (when_done_render_view) {
                    when_done_render_view.render();
                }
            },

            close_manage_content: function() {
                this.$el.hide();
            }

        });
    });
