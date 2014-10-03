<?php

// Start the session and make sure the IP is matched
// in order to prevent a elementary hijacking attack
session_start();
if (isset($_SESSION["ip"])) {
  if ($_SERVER["REMOTE_ADDR"] !== $_SESSION["ip"]) {
    session_regenerate_id();
  }
}
$_SESSION["ip"] = $_SERVER["REMOTE_ADDR"];

// Add CORS related headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: X-Requested-With");

// Explode the request path into parameters
$url_args = explode("/", $_SERVER["PATH_INFO"]);
$controllers = array("user", "match", "proxy");

// Parse the mysql connection settings and connect
// to the database server
$settings = parse_ini_file("config.ini", false);
$mysqli = new mysqli($settings["MYSQL_HOSTNAME"], $settings["MYSQL_USERNAME"], $settings["MYSQL_PASSWORD"], $settings["MYSQL_DATABASE"]);
if ($mysqli->connect_errno) {
  emit_code(500);
  exit;
}

// Helper function to emit HTTP status code
function emit_code($num) {
  $values = array(400 => "Bad request", 401 => "Unauthorized", 404 => "Not found", 409 => "Conflict.", 500 => "Internal server error");
  header("HTTP/1.0 " . $num ." " . $values[$num]);
  echo $values[$num] . ".";
};

// Helper function to query using prepared statements
function query($stmt, $args = null, $all = false) {
  global $mysqli;
  
  $stmt = $mysqli->prepare($stmt);
  
  if (!$stmt) {
    error_log($stmt->error);
    emit_code(500);
    exit;
  }
  
  if ($args) {
    if (!call_user_func_array(array($stmt, "bind_param"), $args)) {
      emit_code(500);
      exit;
    }
  }
  
  if (!$stmt->execute()) {
    error_log($stmt->error);
    return $stmt->errno;
  }
  
  $meta = $stmt->result_metadata();
  if ($meta === false) {
    return true;
  }
  
  $fields = $meta->fetch_fields();
  
  $keys = array();
  $out = array();
  
  foreach($fields as $k => $field) {
    $keys[] = &$out[$field->name];
  }
  
  call_user_func_array(array($stmt, "bind_result"), $keys);
  
  if ($all) {
    $out_all = array();
    while ($stmt->fetch()) {
      $out_copy = array();
      foreach($out as $k => $v) {
        $out_copy[$k] = $v;
      }
      $out_all[] = $out_copy;
    }
    return $out_all;
  } else {
    $stmt->fetch();
    return $out;
  }
};

// See if there is a controller and function registered for
// the current request path and evaluate its function
$processed = false;
if (in_array($url_args[1], $controllers)) {
  include($url_args[1] . ".php");
  if (in_array($url_args[2], $functions)) {
    $processed = true;  
    $body = json_decode(file_get_contents("php://input"));
    if (false && $body === null) {
      emit_code(400);
    } else {
      $result = call_user_func($url_args[2], $mysqli, $body, array_slice($url_args, 3));
      if ($result) {
        header("Content-type: application/json");
        echo json_encode($result);
      }
    }
  }
}

// Otherwise emit a 404 message
if (!$processed) {
  emit_code(404);
}

?>
