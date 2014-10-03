define('util', ['api'], function(api) {

    var USE_PROXY = true;

    // Returns a URL request promise
    var fetch = function(args) {
        if (USE_PROXY) {
            var props = { url: args.url };
            if (args.accept) props.accept = args.accept;
            return api.proxy.request(props);     
        } else {
            var props = {
                url: args.url,
                type: 'GET'
            };
            if (args.accept) {
                props.headers = {
                    Accept: "application/json"
                };
            }
            return $.ajax(props);
        }
    };
    
    // Read or write to a Master-Slave memory-localStorage cache
    // TK: TODO: Refactor
    var cacheDict = {};
    var cache = function(args, data) {
        var key = JSON.stringify(args);
        if (data) {
            cacheDict[key] = data;
        }
        if (window.localStorage) {
            if (data) {
                try {
                    window.localStorage[key] = JSON.stringify(data);
                } catch (e) {
                    // Probably quota exceeded
                }
            } else {
                if (key in cacheDict) {
                    return cacheDict[key];
                } else {
                    return key in window.localStorage ? JSON.parse(window.localStorage[key]) : null;
                }
            }
        } else {
            if (key in cacheDict) {
                return cacheDict[key];
            } else {
                return null;
            }
        }
    };
    
    // Wrap regular data into a promise
    var wrap = function(data) {
        var d = $.Deferred();
        d.resolve(data);
        return d;
    };
    
    return {
        htmlencode: function(txt) {
            // disgusting
            return document.createElement('div').appendChild( 
                document.createTextNode(txt)).parentNode.innerHTML;
        },
        
        cachedQuery: function(args) {
            console.log(args.url);

            var c = cache(args);
            if (c) return wrap(c);
            
            return fetch(args).then(function(data) {
                cache(args, data);
                return data;
            });
        },
        
        startswith: function(a, b) {
           return a.substr(0, b.length) === b;
        },
        
        endswith: function(a, b) {
           return a.substr(a.length - b.length) === b;
        },
        
        format: function(str, args) {
            Object.keys(args).forEach(function(k) {
                var v = args[k];
                if (k === "query") {
                    v = encodeURIComponent(v);
                }
                str = str.replace(new RegExp("{"+k+"}", "g"), v);
            });
            return str;
        },
        
        re: function(str) {
            return new RegExp(str.split('|').map(function(s) { return '^' + s + '$'; }).join('|'));
        },
        
        split: function(str, chr, fn, max) {
            var parts = str.split(chr);
            if (max && parts.length > max) {
                var parts = parts.slice(0, max - 1).concat(parts.slice(max - 1).join(chr));
            }
            fn.apply(null, parts);
        },
        
        debracketize: function(term) {
            if (this.startswith(term, '<') && this.endswith(term, '>')) {
                return term.substr(1, term.length - 2);
            }
            return term;
        }
    };
});
