define(
    [],
    function() {
        return function(text, length) {

            if(text && text.length > length) {
                return text.substr(0,length) + '...';
            }

            return text;
        };
    });
