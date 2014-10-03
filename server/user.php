<?php

function login($mysqli, $body) {
  if (isset($body->username) && isset($body->password)) {
    $types = "s";
    $username = $body->username;
    $password = $body->password;
    
    $result = query("SELECT id, hash FROM user WHERE name=?", array(&$types, &$username));
    
    if (@password_verify($password, $result["hash"])) {
      session_regenerate_id();
      $_SESSION["user_id"] = $result["id"];
      return array("success" => true);
    } else {
      emit_code(401);
    }
  } else {
    emit_code(400);
  }
}

function logout() {
  session_regenerate_id();
  unset($_SESSION["user_id"]);
  return array("success" => true);
}

function register($mysqli, $body) {
  if (isset($body->username) && isset($body->password)) {
    $types = "ss";
    $username = $body->username;
    $hash = password_hash($body->password, PASSWORD_DEFAULT);

    $result = query("INSERT INTO user (name, hash) VALUES (?, ?)", array(&$types, &$username, &$hash));

    if (is_int($result)) {
      emit_code($result === 1062 ? 409 : 500);
    } else {
      $_SESSION["user_id"] = $mysqli->insert_id;
      return array("success" => true);
    }
  } else {
    emit_code(400);
  }
}

function read() {
  if (@$_SESSION["user_id"]) {
    $types = "i";
    $user_id = $_SESSION["user_id"];
    $result = query("SELECT name FROM user WHERE id=?", array(&$types, &$user_id));
    if (@$result["name"]) {
      return array("username" => $result["name"]);
    }
  }
  emit_code(401);
}

$functions = array("login", "register", "read", "logout");
?>
