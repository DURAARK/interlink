define('Settings', ['util', '../lib/domReady!'], function(util) {

    var localStorageKey = "interlink.SETTINGS";

    var Settings = function() {
    
        var self = this;
        var frm = document.getElementById("settingsForm");
        
        var keys, vocabs;
        
        this.build = function() {
            var inputs = $.makeArray($("#settingsForm input"));
            $.merge(inputs, $.makeArray($("#settingsForm textarea")));
            keys = inputs.map(function(e) { return e.name; }).filter(function(s) { return s.length; });
            vocabs = $.makeArray($("a.vocabSetting").map(function(e) { return $(this).text(); }));
            
            keys.forEach(function(k) {
                var fn = function(v) {
                    if (typeof v !== 'undefined') {
                        if (frm[k].type.toUpperCase() === 'CHECKBOX') {
                            frm[k].checked = self['_'+k] = !!v;
                        } else {
                            frm[k].value = self['_'+k] = v;
                        }
                    } else {
                        if (k.indexOf('_') !== -1 && keys.indexOf(k.split('_')[1]) !== -1 && self['_'+k+'inherit']) {
                            // Use the inherited value where appropriate
                            return self['_'+k.split('_')[1]];
                        }
                        return self['_'+k];
                    }
                };
                if (k.indexOf('_') !== -1) {
                    var pt = k.split('_');
                    var di = self[pt[0]] || (self[pt[0]] = {});
                    di[pt[1]] = fn;
                }
                self[k] = fn;
            });
        };
        
        this.parse = function() {
            keys.forEach(function(k) {
                if (frm[k].type.toUpperCase() === 'CHECKBOX') {
                    self['_'+k] = !!frm[k].checked;
                } else {
                    self['_'+k] = frm[k].value;
                }
            });
        };
        
        this.restore = function() {
            if (window.localStorage && window.localStorage[localStorageKey]) {
                var storedSettings = JSON.parse(window.localStorage[localStorageKey]);
                keys.forEach(function(k) {
                    if (typeof storedSettings[k] !== 'undefined') {
                        self[k](storedSettings[k]);
                    }
                });
            }
        };
        
        this.persist = function() {
            if (window.localStorage) {
                var storedSettings = {};
                keys.forEach(function(k) {
                    storedSettings[k] = self[k]();
                });
                try {
                    window.localStorage[localStorageKey] = JSON.stringify(storedSettings);
                } catch(e) {
                    console.log("Failed to persist settings");
                }
            };
        };
        
        this.settingsForUri = function(uri) {
            uri = util.debracketize(uri);
            for (var i = 0; i < vocabs.length; ++i) {
                var vocab = vocabs[i];
                var prefix = self[vocab].prefix();
                if (util.startswith(uri, prefix)) {
                    return self[vocab];
                }
            };
            throw new Error("No endpoint settings registered for <" + uri + ">.");
        };
    };
    
    // Singleton?
    return new Settings();
});