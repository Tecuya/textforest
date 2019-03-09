define(
    ['jquery', 'underscore', 'backbone', 'tpl!templates/statusbar'],
    function($, _, Backbone, statusbartpl) {
        return Backbone.View.extend({
            template: statusbartpl,

            events: {
                'click div#login_link': 'user_link',
                'click div#user_settings_link': 'user_link',
                'click span#user_page_link': 'user_page_link',
                'click div#logout_link': 'logout_link',
                'click div#status_title': 'home',
                'click div.sort_pref': 'sort',
                'click div#notifications_link': 'notification_link',
                'click div#notification_clear_all': 'notification_clear_all'
            },

            initialize: function(options) {
                this.user = options.user;
                this.forest_view = options.forest_view;
            },

            render: function() {
                this.$el.html(
                    this.template(
                        {
                            user: this.user,
                            sort: this.forest_view.sort,
                            sortdir: this.forest_view.sortdir,
                            sortpriop: this.forest_view.sortpriop,
                            notifications: this.forest_view.notifications_collection
                        }));
            },

            user_page_link: function() {
                Backbone.history.navigate('/f/~' + this.user.get('username'), true);
            },

            user_link: function() {
                this.forest_view.user_link();
            },

            logout_link: function() {
                this.forest_view.logout_link();
            },

            home: function() {
                Backbone.history.navigate('/f/home', true);
            },

            sort: function(evt) {
                var targ = $(evt.target);

                var sort = this.forest_view.sort;
                var sortdir = this.forest_view.sortdir;
                var sortpriop = this.forest_view.sortpriop;

                if (targ.data('sort') == 'views') {
                    sort = 'views';

                } else if (targ.data('sort') == 'vote') {
                    sort = 'vote';

                } else if (targ.data('sort') == 'date') {
                    sort = 'date';

                } else if (targ.data('sortdir') == 'asc') {
                    sortdir = 'asc';

                } else if (targ.data('sortdir') == 'desc') {
                    sortdir = 'desc';

                } else if (targ.data('sortpriop') == '1') {
                    sortpriop = !sortpriop;
                }

                this.forest_view.update_sort(sort, sortdir, sortpriop);
            },

            notification_link: function() {
                var notification_area = this.forest_view.$el.find('div#notifications');
                if (notification_area.is(':visible')) {
                    this.forest_view.$el.find('div#notifications').hide();
                } else {
                    this.forest_view.$el.find('div#notifications').show();
                }
            }

        });
    }
);
