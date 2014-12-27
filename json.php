<?php
   $json = $_POST['json'];

   if (json_decode($json) != null) {
   		$id = uniqid();
   		$name = 'temp/WebNotes-'.$id.'.json';
   		$file = fopen($name,'w+'); // FIXME permission denied on univ server
     	fwrite($file, $json);
   		fclose($file);
   		echo $id;
   } else {
   		header('HTTP/1.1 500 Internal Server Booboo');
   		header('Content-Type: application/json; charset=UTF-8');
   }
?>
