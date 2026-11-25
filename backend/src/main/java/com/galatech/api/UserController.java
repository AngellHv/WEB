package com.galatech.api;

import com.galatech.model.AppUser;
import com.galatech.repo.UserRepository;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/usuarios") @PreAuthorize("hasRole('ADMIN')")
public class UserController {
    private final UserRepository users; private final PasswordEncoder encoder;
    public UserController(UserRepository u,PasswordEncoder e){users=u;encoder=e;}
    @GetMapping public List<Contracts.UserView> list(){return users.findByRoleOrderByName("TECHNICIAN").stream().map(Contracts.UserView::of).toList();}
    @PostMapping public Contracts.UserView create(@Valid @RequestBody Contracts.UserRequest r){if(r.password()==null||r.password().length()<10)throw new IllegalArgumentException("La contraseña debe tener al menos 10 caracteres."); AppUser u=new AppUser();u.name=r.name();u.email=r.email().toLowerCase();u.role="TECHNICIAN";u.passwordHash=encoder.encode(r.password());return Contracts.UserView.of(users.save(u));}
    @PutMapping("/{id}") public Contracts.UserView update(@PathVariable UUID id,@Valid @RequestBody Contracts.UserRequest r){AppUser u=users.findById(id).orElseThrow(()->new IllegalArgumentException("Técnico no encontrado."));if(!u.role.equals("TECHNICIAN"))throw new IllegalArgumentException("Usuario no editable.");u.name=r.name();u.email=r.email().toLowerCase();if(r.password()!=null&&!r.password().isBlank()){if(r.password().length()<10)throw new IllegalArgumentException("La contraseña debe tener al menos 10 caracteres.");u.passwordHash=encoder.encode(r.password());}return Contracts.UserView.of(users.save(u));}
    @PatchMapping("/{id}/estado") public Contracts.UserView status(@PathVariable UUID id,@RequestBody Map<String,Boolean> body){AppUser u=users.findById(id).orElseThrow(()->new IllegalArgumentException("Técnico no encontrado."));u.active=Boolean.TRUE.equals(body.get("active"));return Contracts.UserView.of(users.save(u));}
}
