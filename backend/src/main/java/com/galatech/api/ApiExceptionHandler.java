package com.galatech.api;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Objects;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<?> badRequest(IllegalArgumentException e){String message=Objects.toString(e.getMessage(),"Solicitud no válida.");Map<String,String> errors=message.toLowerCase().contains("contraseña")?Map.of("password",message):Map.of();return ResponseEntity.badRequest().body(Map.of("message",message,"errors",errors));}
    @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<?> invalid(MethodArgumentNotValidException e){Map<String,String> errors=new LinkedHashMap<>();e.getBindingResult().getFieldErrors().forEach(error->errors.putIfAbsent(error.getField(),Objects.toString(error.getDefaultMessage(),"Revisa este campo.")));return ResponseEntity.badRequest().body(Map.of("message","Revisa los datos ingresados.","errors",errors));}
    @ExceptionHandler(HttpMessageNotReadableException.class) ResponseEntity<?> unreadable(HttpMessageNotReadableException e){return ResponseEntity.badRequest().body(Map.of("message","El formato de los datos no es válido."));}
    @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<?> conflict(DataIntegrityViolationException e){return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message","El registro entra en conflicto con datos existentes."));}
    @ExceptionHandler(ResponseStatusException.class) ResponseEntity<?> status(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",e.getReason()==null?"Solicitud no válida.":e.getReason()));}
    @ExceptionHandler(AccessDeniedException.class) ResponseEntity<?> forbidden(AccessDeniedException e){return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message","No tienes permiso para esta operación."));}
    @ExceptionHandler(Exception.class) ResponseEntity<?> unexpected(Exception e){return ResponseEntity.status(500).body(Map.of("message","Ocurrió un error interno."));}
}
