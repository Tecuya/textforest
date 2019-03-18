
require.config({
    baseUrl: '/static',
    paths: {
        jquery: 'lib/js/jquery-1.9.1',
        underscore: 'lib/js/underscore',
        backbone: 'lib/js/backbone',
        datatables: 'lib/DataTables-1.10.18/js/jquery.dataTables.min',
        put_cursor_at_end: 'lib/js/put_cursor_at_end',
        tpl: 'lib/js/tpl',
        text: 'lib/js/text',
        showdown: 'lib/js/showdown.min'
    },

    shim: {
        showdown: {
            exports: 'showdown'
        },

        underscore: {
            exports: "_"
        }
    }
});
