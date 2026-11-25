package com.galatech.api;

import com.galatech.repo.UserRepository;
import com.galatech.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository users; private final PasswordEncoder encoder; private final JwtService jwt;
    public AuthController(UserRepository users,PasswordEncoder encoder,JwtService jwt){this.users=users;this.encoder=encoder;this.jwt=jwt;}
    @PostMapping("/login") public Map<String,Object> login(@Valid @RequestBody Contracts.LoginRequest request){
        var user=users.findByEmailIgnoreCase(request.email()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Correo o contraseña incorrectos."));
        if(!user.active||!encoder.matches(request.password(),user.passwordHash)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Correo o contraseña incorrectos.");
        return Map.of("token",jwt.create(user),"user",Contracts.UserView.of(user));
    }
}
