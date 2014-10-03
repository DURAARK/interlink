import sys
import glob
import itertools

from rdflib.graph import Graph
from rdflib.term import URIRef

ROWS_PER_INSERT = 1000

SQL_START = "INSERT INTO potential_matches (uri1, uri2) VALUES"
SQL_ROW   = "  ('%s', '%s')"
SQL_END   = ";"

def escape(s):
    # NB: This is not a general SQL string escaping routine,
    # as something like that would depend on dialect settings.
    return s.replace("'", "\\'");

def pair():
    fns = glob.glob("../data/*.nt")
    for fn in fns:
        g = Graph()
        g.parse(fn, format="nt")
        for s, p, o in g:
            if all(map(lambda a: isinstance(a, URIRef), (s, o))):
                yield s, o

# From: https://docs.python.org/2/library/itertools.html#recipes
def grouper(iterable, n, fillvalue=None):
    args = [iter(iterable)] * n
    return itertools.izip_longest(fillvalue=fillvalue, *args)
    
for chunk in grouper(pair(), ROWS_PER_INSERT):
    print SQL_START
    first = True
    for r in (c for c in chunk if c):
        if not first:
            print ","
        sys.stdout.write(SQL_ROW % tuple(map(escape, r)))
        first = False
    print SQL_END
