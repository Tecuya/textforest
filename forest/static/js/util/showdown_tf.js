define(
    ['showdown'],
    function(showdown) {
        var converter = new showdown.Converter({
            extensions: [
                function() {
                    return [{
                        type: 'lang',
                        filter: function(text, converter, options) {
                            text = text.replace(
                                /\[([^\]]+)\]\(\/f\/([a-z0-9\-\~]+)\)/g,
                                '<span class="node_link" data-slug="$2">$1</span>');
                            
                            text = text.replace(
                                /([^\]]?)\/f\/([a-z0-9\-\~]+)/g,
                                '$1<span class="node_link" data-slug="$2">/f/$2</span>');

                            return text;
                            
                        }
                    }];
                }]
        });
        
        return converter;
    });
