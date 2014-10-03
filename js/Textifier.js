define('Textifier', function() {
    return function() {
        this[0] = '<';
        var entries = this.entries = [];
        var hash = this.hash = {};
        this.valueOf = function() {
            var prev = null;
            // scrollbar doesn't work well with zoom/pannable svg
            // var str = '<div class="overflow">';
            var str = '';
            entries.forEach(function(a, idx, arr) {
                var l = arr.length;
                if (prev != a[0]) {
                    if (a[0] !== 'name' && a[0] != 'name2') {
                        str += a[0];
                    }
                    prev = a[0];
                }
                if (l < 8 || idx < 4 || idx === (l-1)) {
                    str += a[1];
                } else if (l >= 8 && idx === 4) {
                    str += "<span>...</span><br>";
                }
            });
            // str += '</div>';
            return str;
        };
        this.add = function(nm, val) {
            if (nm in hash) {
                entries.splice(hash[nm], 0, [nm, val]);
            } else {
                hash[nm] = entries.length;
                entries.push([nm, val]);
            }
        };
        this.merge = function(other) {
            var self = this;
            other.entries.forEach(function(e) {
                self.add(e[0], e[1]);
            });
        };
    };
});