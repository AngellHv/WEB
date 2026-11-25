package com.galatech.config;

import com.galatech.security.JwtFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.http.HttpMethod;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import java.util.List;

@Configuration @EnableMethodSecurity
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder(){ return new BCryptPasswordEncoder(); }
    @Bean SecurityFilterChain security(HttpSecurity http, JwtFilter jwtFilter, @Qualifier("cors") CorsConfigurationSource corsSource) throws Exception {
        return http.csrf(c->c.disable()).cors(c->c.configurationSource(corsSource)).formLogin(f->f.disable()).httpBasic(b->b.disable()).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.requestMatchers(HttpMethod.OPTIONS,"/**").permitAll().requestMatchers("/api/auth/login","/api/seguimiento/**","/error").permitAll().anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class).build();
    }
    @Bean CorsConfigurationSource cors(@Value("${galatech.cors-origin}") String origin) {
        CorsConfiguration c=new CorsConfiguration(); c.setAllowedOriginPatterns(List.of(origin,"http://localhost:4200","http://127.0.0.1:4200")); c.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS")); c.setAllowedHeaders(List.of("*")); c.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource s=new UrlBasedCorsConfigurationSource(); s.registerCorsConfiguration("/**",c); return s;
    }
}
