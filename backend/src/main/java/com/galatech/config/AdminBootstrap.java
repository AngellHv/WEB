package com.galatech.config;

import com.galatech.model.AppUser;
import com.galatech.repo.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminBootstrap {
    @Bean CommandLineRunner createInitialAdmin(UserRepository users, PasswordEncoder encoder,
        @Value("${galatech.admin.email:}") String email, @Value("${galatech.admin.password:}") String password, @Value("${galatech.admin.name}") String name) {
        return args -> {
            if (email.isBlank() && password.isBlank()) return;
            if (email.isBlank() || password.length()<12) throw new IllegalStateException("Configure ADMIN_EMAIL y una ADMIN_PASSWORD de al menos 12 caracteres juntas.");
            if (users.findByEmailIgnoreCase(email).isEmpty()) { AppUser admin=new AppUser(); admin.name=name; admin.email=email.toLowerCase(); admin.passwordHash=encoder.encode(password); admin.role="ADMIN"; admin.active=true; users.save(admin); }
        };
    }
}
