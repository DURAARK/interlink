define('prefixes', ['util', 'Settings'], function(util, Settings) {

var prefixToUri;
var uriToPrefix;

var init = function() {
    prefixToUri = {};
    uriToPrefix = {};

    var ttl = Settings.prefixes().trim().split('\n');
    var regexes = [/^@prefix /, /\.$/];

    ttl.forEach(function(s) {
        regexes.forEach(function(re) {
            s = s.replace(re, '');
        });
        util.split(s, ':', function(prefix, uri) {
            uri = uri.trim();
            uri = uri.substr(1, uri.length - 2);
            prefixToUri[prefix] = uri;
            uriToPrefix[uri] = prefix;
        }, 2);
    });

};

// init();

return {
    expand:function(term) {
        var parts = term.split(':');
        if (parts[0] in prefixToUri) {
            return '<' + prefixToUri[parts[0]] + parts[1] + '>';
        } else {
            return term;
        }
    },
    
    compress: function(term) {
        term = util.debracketize(term);
        var hash = term.lastIndexOf('#');
        var slash = term.lastIndexOf('/');
        if (hash === -1 && slash === -1) {
            return term;
        }
        var chr = hash > slash ? '#' : '/';
        var parts = term.split(chr);
        var namespace = parts.splice(0, parts.length - 1).join(chr) + chr;
        var name = parts[parts.length - 1];
        if (namespace in uriToPrefix) {
            return uriToPrefix[namespace] + ':' + name;
        } else {
            return term;
        }
    },
    
    init: init
};

});