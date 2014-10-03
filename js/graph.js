define('graph', ['Textifier', 'util', 'prefixes', 'queryBuilder'], function(Textifier, util, prefixes, queryBuilder) {
    
    var Graph = function(settings) {
    
        // Stores the result of the graph layout algorithm this
        // a reference is kept in order to synchronise the future
        // position of the active nodes within the two graphs.
        var layoutGraph;
        
        var nodes = {};
        var edges = [];
        var all_nodes = {};
        var all_edges = {};        
        
        var graph = null;
        var renderer = null;
        var centerUri = null;
        var centerNode = null;
        var gathered_uris = {};
        
        var self = this;
        var zoom = null;
        
        // To state variables to make sure the positioning doesn't
        // end up in an end-less loop.
        var doReposition = true;
        var automaticPan = false;
        
        var languages = util.re(settings.languages);
        var predicates = util.re(settings.predicates);
        var predicateList = settings.predicates.split('|');
        
        var svg = document.getElementById(settings.domNode);
        
        var centerX = $(svg).width() / 2, centerY = $(svg).height() / 2;
        
        var init = this.init = function() {
            // Create a new directed graph
            graph = new dagreD3.Digraph();
            renderer = new dagreD3.Renderer();
            // Read left to right.. no ordering within ranks
            renderer.layout(dagre.layout().rankDir("LR").orderIters(-1));
            
            // Add a transition
            renderer.transition(function (selection) {
              return selection.transition(); // .duration(500);
            });
        };
        
        init();
        
        var reposition = this.reposition = function(st) {
            
            var elem = d3.select('#'+ settings.domNode + ' .active')[0][0];
            if (!elem) return;
            
            var node = layoutGraph.node(settings.centerUri);
            centerUri = settings.centerUri;
            var svg = document.getElementById(settings.domNode)
            var mat = svg.createSVGMatrix();
            var pt = svg.createSVGPoint();
            
            pt.x = node.x;
            pt.y = node.y;
            
            while (true) {
                elem = elem.parentNode;
                if (!elem.transform) break;
                var trsf = elem.transform.baseVal;
                for (var i = 0; i < trsf.numberOfItems; ++i) {
                    mat = mat.multiply((trsf[i] || trsf.getItem(i)).matrix);
                }                
            }
            
            pt = pt.matrixTransform(mat);
            
            if (doReposition || st.doReposition) {
                doReposition = false;
                automaticPan = true;
                var translate = zoom.translate();
                if (st.onlyX) {
                    zoom.translate([centerX - pt.x + translate[0], translate[1]]);
                } else {
                    zoom.translate([centerX - pt.x + translate[0], centerY - pt.y + translate[1]]);
                }
                zoom.event(d3.select('#'+ settings.domNode + " g"));
            } else if (self.onPan && !st.noFire) {
                self.onPan({x: pt.x, anim: st.anim})
            }
        };
        
        this.externalPan = function(evt) {
            centerX = evt.x;
            reposition({noFire:true, doReposition: true, onlyX: true});
        };
        
        var repositionOther = function() {
            var elem = d3.select('#'+ settings.domNode + ' .active')[0][0];
            if (!elem || !layoutGraph) return;
            
            var bb = elem.getBoundingClientRect();
            var x = bb.left + bb.width / 2;
            if (self.onPan) {
                self.onPan(x);
                centerX = x;
            }
        };
        
        // renderer.postRender(reposition);
        
        // This is almost the same as renderer.defaultZoom but allows us to listen in on the event and reposition the other graph
        renderer.zoom(function(graph, svg) {
            zoom = d3.behavior.zoom();
            return zoom.on('zoom', function() {
                svg.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
                if (!automaticPan) {
                    reposition({anim: false});
                }
                automaticPan = false;
            });
        });

        var render = this.render = function() {
            layoutGraph = renderer.run(graph, d3.select('#'+ settings.domNode + " g"));
        };
        
        this.getCenterUri = function() {
            return centerUri;
        };
        
        var isInteresting = function(a) {
            if (prefixes.compress(a).match(predicates)) return true;
            console.log(a);
            return false;
        };
        
        var query = this.query = function(uri) {
        
            if (uri in gathered_uris) return;
            gathered_uris[uri] = 1;
            
            var center_label = nodes[uri] = new Textifier();
            if (util.startswith(uri, "http://")) {
                center_label.add("name", "<a target='_blank' href='"+uri+"' class='uri'>"+uri+"</a><br>");
            } else {
                center_label.add("name", "<a target='_blank' href='#' onclick='return false;' class='uri'>"+uri+"</a><br>");
            }
            
            var add = function(a, b, c, p) {
                var lang = null;
                if (c.lang) lang = c.lang.substr(0,2);
                if (c["xml:lang"]) lang = c["xml:lang"].substr(0,2);
                
                if (lang && !lang.match(languages)) return;
                
                lang = lang || "&nbsp;&nbsp;";
                
                cstr = '<span class="lang">' + lang + '</span><span class="value">' + util.htmlencode(c.value) + '         </span><br>';
                if (c.type === 'uri') { // use .token with rdf-store
                    var t = nodes[c.value] = new Textifier();
                    t.add("name", cstr);
                    edges.push([a ? c.value : p, a ? p : c.value, prefixes.compress(b), a]);
                } else {
                    center_label.add('<span class="pred">' + prefixes.compress(b) + '</span><br>', cstr);
                }
            };
            
            util.cachedQuery({accept: settings.accept, url: util.format(settings.endpoint, {
                fmt: 'json',
                query: queryBuilder.fromSubjectAndPredicates(uri, predicateList)
            })}).then(function(response)
            {
                response.results.bindings.forEach(function(record) {
                    var n = record.o;
                    var p = record.p.value;
                    if (!isInteresting(p)) return;
                    add(1, p, n, uri);
                });
                
                util.cachedQuery({accept: settings.accept, url: util.format(settings.endpoint, {
                    fmt: 'json',
                    query: queryBuilder.fromObjectAndPredicates(uri, predicateList)
                })}).then(function(response)
                {
                    response.results.bindings.forEach(function(record) {
                        var n = record.o;
                        var p = record.p.value;
                        if (!isInteresting(p)) return;
                        add(0, p, n, uri);
                    });
                    
                    // We want to collapse nodes that have many sibling nodes with the same relation to their parent
                    var edge_map = {};
                    edges.forEach(function(e) {
                        var k = '' + e[3] + '_' + (e[3] ? e[1] : e[0]) + '_' + e[2];
                        (edge_map[k] || (edge_map[k] = [])).push(e);
                    });
                    
                    var new_edges = [];
                    Object.keys(edge_map).forEach(function(k) {
                        var edges = edge_map[k];
                        if (edges.length > 5) {
                            var other_uris = edges.map(function(e) { return e[3] ? e[0] : e[1]; });
                            // TK: TODO: Maybe create a hash out of this
                            // if it turns out strings grow too long...
                            var new_key = "merge_" + other_uris.sort().join("_");  // + (mergeCount ++);
                            var txt = nodes[new_key] = new Textifier();
                            txt.add("name2", "<span class='uri'>"+edges.length +" URIs</span><br>");
                            
                            edges.forEach(function(e) {
                                var k = e[3] ? e[0] : e[1];
                                if (k in nodes) {
                                    // If k not in nodes, than this is an earlier node that is already drawn in full?
                                    txt.merge(nodes[k]);
                                    delete nodes[k];
                                    
                                    new_edges.push([e[3] ? new_key : e[0], e[3] ? e[1] : new_key, e[2], e[3]]);
                                }
                            });
                        } else {
                            edges.forEach(function(e) {
                                new_edges.push(e);
                            });
                        }
                    });
                    
                    Object.keys(nodes).forEach(function(k) {
                        var label = nodes[k].valueOf();
                        if (all_nodes[k]) {
                            if (graph.node(k).label.length < label.length) {
                                graph.node(k).label = label;
                            }
                        } else {
                            try {
                                graph.addNode(k, { label: label });
                                all_nodes[k] = 1;
                            } catch(e) {
                                console.log("Error drawing node", k);
                            }
                        }

                    });
                    
                    new_edges.forEach(function(e) {
                        if (!all_edges[e[0]+'_'+e[1]]) {
                            try {
                            graph.addEdge(null, e[0], e[1], {label: e[2]});
                            all_edges[e[0]+'_'+e[1]] = 1;
                            } catch(e) {}
                        }
                    });
                    
                    render();
                    
                    if (!centerNode) {
                        centerNode = graph.node(uri);
                        var d = document.getElementById('outerTransform');
                        var sel = d3.select('#'+ settings.domNode + ' g.node').classed("active", true);
                    }

                    reposition({anim: true});            
                });
            });
        
        };
        
        query(settings.centerUri);
        
        // overwrite
        svg.onclick = function(evt) {
            var elems = [evt.target];
            var data = evt.target.__data__;
            while (true) {
                var p = elems[elems.length-1].parentNode;
                if (!p) break;
                elems.push(p);
            }
            if (data) {
                var edges = elems.filter(function(n) { return n.className && n.className.baseVal && n.className.baseVal.indexOf("edgeLabel") !== -1; });
                if (edges.length !== 0) {
                    // Don't handle clicks on edge (labels)
                    data = null; 
                }
            } else {
                var tagnames = elems.map(function(n) { return n.tagName; });
                var fo_index = tagnames.indexOf("foreignObject");
                if (fo_index !== -1) {
                    data = elems[fo_index+1].__data__;
                }
            }
            if (data) {
                if (data.substr(0, 5) === 'merge') {
                    // Merge nodes are not queried.. but what to do with them?
                } else {
                    if (data in gathered_uris) {
                        // This node has already been expanded, make it the
                        // new center node.
                        centerUri = settings.centerUri = data;
                        d3.selectAll('#'+ settings.domNode + ' g.node').classed("active", function(id) {
                            return data === id;
                        });
                        reposition({anim: true});
                    } else {
                        nodes = {};
                        edges = [];
                        query(data);
                    }
                }
            }
        };
        
        var destroy = this.destroy = function() {
            ["zoom", "overlay"].forEach(function(n) {
                d3.select('#' + settings.domNode + " ." + n).remove();
            });
            d3.select("#" + settings.domNode + " .outerTransform").attr('transform', "translate(0,0)");
        }
    
    };
    
    return Graph;
})