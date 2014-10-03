require(['graph', 'Settings', 'prefixes', 'api', '../lib/text!../config.json'], function(Graph, Settings, prefixes, api, configText) {

    var upperGraph, lowerGraph;
    var layout;
    var centerX;
    
    (function(cfg) {
        // Build the DOM elements based on the configuration
        // and populate the inputs with the provided values
        ["languages", "predicates", "prefixes"].forEach(function(k) {
            var input = $("#settingsForm input[name="+k+"], #settingsForm textarea[name="+k+"]");
            var chr = input.attr('type') === 'text' ? "|" : "\n";
            input.val(cfg[k].join(chr));
        });
        
        Object.keys(cfg.vocabularies).forEach(function(vocab_id, idx) {
            var vocab_settings = cfg.vocabularies[vocab_id];
            var className = idx === 0 ? "vocabSetting active" : "vocabSetting";
            $("#vocabSettingsLinks").append($("<a></a>").attr("href", "#").attr("class", className).text(vocab_id));
            
            var panel = $("<div></div>").attr("class", "vocabSettingPanel").attr("id", "vocabSettingsPanel_" + vocab_id);
            ["Prefix", "Endpoint", "Accept", "Languages", "Predicates"].forEach(function(caption, idx) {
                var nm = caption.toLowerCase();
                var id = vocab_id + "_" + nm;
                var mandatory = idx <= 1;
                var val = cfg.vocabularies[vocab_id][nm];
                panel.append($("<label></label>").text(caption));
                var input = $("<input></input>").attr("type", "text").attr("name", id);
                if (!mandatory) {
                    var check = $("<input></input>").attr("type", "checkbox").attr("name", id + "inherit");
                    if (!val) {
                        check.attr("checked", true);
                    }
                    panel.append(check);
                    input.attr("class", "with_checkbox");
                }
                if (val) {
                    if (Array.isArray(val)) {
                        val = val.join("|");
                    }
                    input.val(val);
                }
                panel.append(input);
            });
            $("#vocabSettingsContainer").append(panel);
        });
    })(JSON.parse(configText));
    
    Settings.build();    
    Settings.parse();
    Settings.restore();
    prefixes.init();
    
    var previousResponse;
    
    var createGraphs = function(response) {
        if (upperGraph) {
            upperGraph.destroy();
            lowerGraph.destroy();
        }
        
        var resp = response || previousResponse;
        
        // Keep a reference in case settings are updated
        previousResponse = resp;
        
        var upperSettings = Settings.settingsForUri(resp.uri1);
        var lowerSettings = Settings.settingsForUri(resp.uri2);
        
        upperGraph = new Graph({
            domNode: "svg1",
            centerUri: resp.uri1,
            endpoint: upperSettings.endpoint(),
            languages: upperSettings.languages(),
            predicates: upperSettings.predicates(),
            accept: upperSettings.accept()
        });
        
        lowerGraph = new Graph({
            domNode: "svg2",
            centerUri: resp.uri2,
            endpoint: lowerSettings.endpoint(),
            languages: lowerSettings.languages(),
            predicates: lowerSettings.predicates(),
            accept: lowerSettings.accept()
        });
        
        var wrapPositioning = function(fn) {
            return function(evt) {
                centerX = evt.x;
                layout({onlyBg:true, anim:evt.anim});
                fn(evt);
            }
        }
        
        upperGraph.onPan = wrapPositioning(lowerGraph.externalPan);
        lowerGraph.onPan = wrapPositioning(upperGraph.externalPan);
    };
    
    var fetchAndCreate = function() {
        centerX = null;
        layout({onlyBg: true});
        api.match.read().then(createGraphs);
    };

    var init = function() {
        $("#settings").click(function(e) {
            e.preventDefault();
            $("#settingsPanel").fadeIn();
            $("#settings").hide();
        });
        
        $("#user").click(function(e) {
            e.preventDefault();
            $("#userPanel").fadeIn();
            $("#user").hide();
        });
        
        var formEvent = function(submit) {
            return function(e) {
                if (submit) {
                    e.preventDefault();
                    Settings.parse();
                    Settings.persist();
                    prefixes.init();
                    centerX = null;
                    layout({onlyBg: true});
                    createGraphs();
                }
                $("#settingsPanel").fadeOut();
                $("#settings").show();
            };
        };
        $("#settingsForm").bind('submit', formEvent(true));
        $("#settingsForm").bind('reset', formEvent(false));
        
        var loggedIn = function(name) {
            if (name) {
                $("#user").css("backgroundImage", "url(img/loggedin.png)");
                $("#username").text(name);
                $("#logoutForm").show();
                $("#userForm").hide();
            } else {
                $("#user").css("backgroundImage", "url(img/user.png)");
                $("#logoutForm").hide();
                $("#userForm").show();                
            }
        };
        
        var userEvent = function(action) {
            return function(e) {
                e.preventDefault();
                $("#userPanel").fadeOut();
                $("#user").show();
                if (action === 'login') {
                    var button = window.userAction;
                    var username = e.target.username.value;
                    var password = e.target.password.value;
                    api.user[button]({
                        username: username,
                        password: password 
                    }).then(function(ret) {
                        if (ret.success) {
                            loggedIn(username);
                        }
                    }, function(ret) {
                        if (ret.status === 409) {
                            throw new Error("A user with that name already exists");
                        } else {
                            throw new Error("Invalid credentials");
                        }
                    });
                } else if (action === 'logout') {
                    api.user.logout();
                    $("#userForm input[type=text], #userForm input[type=password]").val('');
                    loggedIn(false);
                }                
            }
        };
        
        api.user.read().then(function(ret) {
            loggedIn(ret.username);
        }, function() {
            // not logged in, do nothing.
        });
        
        $("#userForm").bind('submit', userEvent('login'));
        $("#userForm").bind('reset', userEvent('close'));
        $("#logoutForm").bind('submit', userEvent('logout'));
        
        var clickEvent = function(elem) {
            return function(e) {
                var vocab = elem.text();
                var container = $("#vocabSettingsMask");
                var child = $("#vocabSettingsPanel_" + vocab);
                e.preventDefault();
                $("a.vocabSetting").removeClass("active");
                elem.addClass("active");
                container.animate({
                    scrollLeft: child.offset().left - container.offset().left + container.scrollLeft()
                });
            };
        };
        
        $("a.vocabSetting").each(function(a) {
            $(this).click(clickEvent($(this)));
        });
        
        $(":checkbox").each(function(elem) {
            var toggle = function() {
                $(this).next("input").prop('disabled', $(this).prop('checked'));
            };
            $(this).change(toggle);
            toggle.call($(this));
        });
        
        $("#error").click(function() {
            $("#error").fadeOut();
        });
        
        var center = function(elem) {
            elem.css("top", Math.max(0, (($(window).height() - $(elem).outerHeight()) / 2) + 
                                                        $(window).scrollTop()) + "px");
            elem.css("left", Math.max(0, (($(window).width() - $(elem).outerWidth()) / 2) + 
                                                        $(window).scrollLeft()) + "px");
        }
        
        window.onerror = function(msg, url, line, col, error) {
            $("#error .message").text(error.message);
            center($("#error"));
            $("#error").fadeIn();
        };
        
        $("#submitLink").click(function() {
            api.match.create({id: previousResponse.id, type: $("#linkTypeSelect").val(), uri1: upperGraph.getCenterUri(), uri2: lowerGraph.getCenterUri()});
        });
        
        $("#refreshView").click(fetchAndCreate);
    };
    
    init();

    layout = function(settings) {
        settings = settings || {}
        if (!settings.onlyBg) {
            for (var i = 1; i < 3; ++i) {
                var svg = document.getElementById('svg' + i);

                svg.style.width = window.innerWidth + 'px';
                svg.style.height = window.innerHeight / 2 - 2 + 'px';
            }
            
            var settingsPanel = document.getElementById('settingsPanel');
            settingsPanel.style.height = window.innerHeight - 64 + 'px';
        }
        
        var input = document.getElementById("linkType");
        if (settings.first || settings.onlyBg) {
            var transition = settings.anim ? function(s) { return s.transition(); } : function(s) { return s; };
            transition(d3.select(input)).style('left', (centerX || (window.innerWidth / 2)) - input.offsetWidth / 2);
            transition(d3.select(document.body)).style('background-position', (centerX || (window.innerWidth / 2)) + 'px center');
        }
        input.style.top = window.innerHeight / 2 - input.offsetHeight / 2 - 2 + 'px';
    };
    
    layout({first:true});
    
    $(window).resize(layout);
    
    $(fetchAndCreate);
});