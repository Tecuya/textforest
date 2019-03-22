
define(
    ['jquery', 'underscore', 'backbone'],

    function($, _, Backbone) {

        var min_fetch_interval = 750;

        return function(options) {
            window.setTimeout(
                function() {

                    if(options.noop_condition && options.noop_condition()) {
                        return;
                    }

                    var queuetime = new Date().getTime();
                    self.highest_queue_time = queuetime;

                    if(options.expedite_condition && options.expedite_condition()) {
                        options.refresh();
                        return;
                    }

                    var milliseconds = new Date().getTime();
                    var fetchwait = 0;
                    if (options.lastfetch) {
                        var time_since_fetch = milliseconds - options.lastfetch;
                        if (time_since_fetch > min_fetch_interval) {
                            fetchwait = 0;
                        } else {
                            fetchwait = min_fetch_interval - time_since_fetch;
                        }
                    }

                    window.setTimeout(
                        function() {
                            // nuke superceded jobs
                            if (queuetime < self.highest_queue_time) {
                               return;
                            }
                            options.refresh();
                        },
                        fetchwait);
                },
                10);
        };

    }
);
