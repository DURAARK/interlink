define('api', [], function() {
    
    var request = function(url) {
        return function(args) {
            return $.ajax({
                url: "/interlink/server/" + url,
                type: 'POST',
                data: JSON.stringify(args)
            });
        };
    };
    
    var methods = {
        'user': ['login', 'logout', 'read', 'register'],
        'match': ['read', 'create'],
        'proxy': ['request']
    };
    
    var api = function() {
        var self = this;
        Object.keys(methods).forEach(function(controller) {
            self[controller] = {};
            methods[controller].forEach(function(fn) {
                self[controller][fn] = request(controller + "/" + fn);
            });
        });
    };
    
    return new api();
    
});