
require.config({
    baseUrl: '/static/js',
    paths: {
        jquery: 'lib/jquery-1.9.1',
        underscore: 'lib/underscore',
        backbone: 'lib/backbone',
        put_cursor_at_end: 'lib/put_cursor_at_end',
        tpl: 'lib/tpl',
        text: 'lib/text',
        showdown: 'lib/showdown.min'
    },

    shim: {
        showdown: {
            exports: 'showdown'
        }
    }
});
