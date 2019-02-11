
define(
    ['jquery',
        'underscore',
        'backbone'],

    function($, _, Backbone) {

        var min_fetch_interval = 1500;

        return function(lastfetch, refresh) {

            // determine when the fetch should occur so as not to
            // violate min_fetch_interval
            var milliseconds = new Date().getTime();
            var fetchwait = 0;
            if (lastfetch) {
                var time_since_fetch = milliseconds - lastfetch;
                if (time_since_fetch > min_fetch_interval) {
                    fetchwait = 0;
                } else {
                    fetchwait = min_fetch_interval - time_since_fetch;
                }
            }

            var queuetime = new Date().getTime();

            self.highest_queue_time = queuetime;

            window.setTimeout(
                function() {
                    // nuke superceded jobs
                    if (queuetime < self.highest_queue_time) return;
                    refresh();
                },
                fetchwait);
        };

    }
);
