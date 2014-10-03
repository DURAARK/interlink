<?php

function read($mysqli, $body) {
  $types = "s";
  $username = $body->username;
  $password = $body->password;
  
  $res = query("SELECT id, uri1, uri2 FROM potential_matches ORDER BY num_results ASC, RAND() LIMIT 1");
  
  if (!$res["id"]) {
    emit_code(404);
  } else {
    return $res;
  }
}

function create($mysqli, $body) {
  $type = "s";
  $types = "sii";
  $types2 = "issis";
  
  $name = session_id();
  $match_id = $body->id;
  $result = $body->type;
  $uri1 = $body->uri1;
  $uri2 = $body->uri2;
  $user_id = isset($_SESSION["user_id"]) ? $_SESSION["user_id"] : null;
  $ip = ip2long($_SERVER["REMOTE_ADDR"]);
  
  query("INSERT IGNORE INTO session (name, user_id, ip) VALUES (?, ?, ?)", array(&$types, &$name, &$user_id, &$ip));
  $session = query("SELECT id FROM session WHERE name=?", array(&$type, &$name));
  $session_id = $session["id"];
  $result = query("INSERT INTO match_results (match_id, uri1, uri2, session_id, result) VALUES (?, ?, ?, ?, ?)", array(&$types2, &$match_id, &$uri1, &$uri2, &$session_id, &$result));
  
  if ($result) {
    return array("success" => true);
  } else {
    emit_code(500);
  }
}

function write_record($uri1, $uri2, $types, $users) {
  $id = md5($uri1 . $uri2);

  $type_count = array();
  foreach($types as $t) { $type_count[$t] ++; }
  $most_used_type = array_keys($type_count, max($type_count))[0];
  
  $stmts = array("<link_$id> a vol:Link ",
                 "  vol:linksResource <$uri1> ",
                 "  vol:linksResource <$uri2> ",
                 "  vol:usedLinkingMethod <interlink> ",
                 "  vol:hasType $most_used_type ");
  
  $users = array_unique($users[$most_used_type]);               
  foreach ($users as $user) {
    $stmts[] = "  dc-term:creator <$user> ";
  }
  
  for ($i = 0; $i < count($stmts); ++$i) {
    echo $stmts[$i] . (($i == count($stmts) - 1) ? "." : ";" ) . "\n";
  }
  
  echo "\n";
}

function export($mysqli, $body) {
  header("Content-type: text/turtle");
  
  echo "@prefix owl: <http://www.w3.org/2002/07/owl#>
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
@prefix skos: <http://www.w3.org/2004/02/skos/core#>
@prefix vol: <http://purl.org/vol/ns#>
@prefix dc-term: <http://purl.org/dc/terms/>
  
<interlink> a vol:LinkingMethod ;
  rdfs:comment \"A web-based tool for the manual verification of automatic ontology alignments\"@en ;
  dcterms:creator <http://www.ddss.nl/Eindhoven/staff/Jakob.Beetz> ;
  dcterms:creator <http://www.ddss.nl/Eindhoven/staff/Thomas.Krijnen> .

";

  $sql = "SELECT r.uri1, r.uri2, r.result, u.name 
          FROM match_results r, session s, user u 
          WHERE r.session_id = s.id 
          AND s.user_id = u.id 
          ORDER BY r.uri1 ASC, r.uri2 ASC";
          
  $matches = query($sql, null, true);
  
  // Add a final element distinct from the previous elem
  $matches[] = array("uri1"=>"tail", "uri2"=>"tail");
  
  // NB: This assumes that {uri1, uri2} form a unique set
  // in the list of potential matches. I.e. if [uri1, uri2]
  // is defined than [uri2, uri1] shall not be defined.
  $previous = null;
  $types = array();
  $users = array();
  foreach($matches as $match) {
    if ($previous && ($previous["uri1"] !== $match["uri1"] || $previous["uri2"] !== $match["uri12"])) {
      write_record($previous["uri1"], $previous["uri2"], $types, $users);
      $types = array();
      $users = array();
    }
    $types[] = $match["result"];
    if ($match["name"]) {
      $users[$match["result"]][] = $match["name"];
    }
    $previous = $match;
  }
  
  return null;
}

$functions = array("create", "read", "export");
?>
