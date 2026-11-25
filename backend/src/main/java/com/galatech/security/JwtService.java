package com.galatech.security;

import com.galatech.model.AppUser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey key;
    private final long expiration;
    public JwtService(@Value("${galatech.jwt.secret}") String secret, @Value("${galatech.jwt.expiration-ms}") long expiration) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) throw new IllegalStateException("JWT_SECRET debe contener al menos 32 bytes.");
        this.key=Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); this.expiration=expiration;
    }
    public String create(AppUser user) { var now=new Date(); return Jwts.builder().subject(user.email).claim("role",user.role).issuedAt(now).expiration(new Date(now.getTime()+expiration)).signWith(key).compact(); }
    public String subject(String token) { return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject(); }
}
