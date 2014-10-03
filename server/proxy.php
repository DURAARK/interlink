<?php
function request($mysqli, $body) {
  
  if (!isset($body->url)) {
    emit_code(400);
    return null;
  }
  
  $curl = curl_init($body->url);
  
  curl_setopt($curl, CURLOPT_FOLLOWLOCATION, true);
  curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
  
  if (isset($body->accept)) {
    curl_setopt($curl, CURLOPT_HTTPHEADER, array(
      "Accept: " . $body->accept
    ));
  }
  
  header("Content-type: application/json");
  
  echo curl_exec($curl);
  curl_close($curl);
  return null;
  
}

$functions = array("request");
?>