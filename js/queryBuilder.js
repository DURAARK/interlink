define('queryBuilder', ['prefixes'], function(prefixes) {
    return {
        fromSubjectAndPredicates: function(subjectUri, predicates) {
            return 'SELECT * {' + predicates.map(prefixes.expand).map(function(pred) {
                return '{SELECT ("' + pred + '" as ?p) ?o WHERE {' +
                            '<' + subjectUri + '> ' + pred + ' ?o .'  +
                       '}}';
            }).join(" UNION ") + '}';
        },
        fromObjectAndPredicates: function(objectUri, predicates) {
            return 'SELECT * {' + predicates.map(prefixes.expand).map(function(pred) {
                return '{SELECT ("' + pred + '" as ?p) ?o WHERE {' +
                            '?o ' + pred + ' <' + objectUri + '> .'  +
                       '}}';
            }).join(" UNION ") + '}';
        }
    }
});