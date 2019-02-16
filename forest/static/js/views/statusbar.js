define(
    ['jquery', 'underscore', 'backbone', 'tpl!templates/statusbar'],
    function($, _, Backbone, statusbartpl) {
        return Backbone.View.extend({
            template: statusbartpl,

            events: {
                'click div#login_link': 'user_link',
                'click div#user_settings_link': 'user_link',
                'click div#logout_link': 'logout_link',
                'click div#status_title': 'home',
                'click div.sort_pref': 'sort'
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
                            sortdir: this.forest_view.sortdir
                        }));
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
                }

                this.forest_view.update_sort(sort, sortdir);
            }

        });
    }
);
