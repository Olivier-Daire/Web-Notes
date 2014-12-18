<?php
   $json = $_POST['json'];

   if (json_decode($json) != null) {
   		$name = 'temp/WebNotes-'.uniqid().'.json';
   		$file = fopen($name,'w+');
     	fwrite($file, $json);
   		fclose($file);
   } else {
   		header('HTTP/1.1 500 Internal Server Booboo');
   		header('Content-Type: application/json; charset=UTF-8');
   }
?>
