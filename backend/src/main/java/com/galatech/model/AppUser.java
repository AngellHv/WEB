package com.galatech.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity @Table(name="usuarios")
public class AppUser {
    @Id @GeneratedValue(strategy=GenerationType.UUID) public UUID id;
    @Column(nullable=false) public String name;
    @Column(nullable=false, unique=true) public String email;
    @Column(name="password_hash", nullable=false) public String passwordHash;
    @Column(nullable=false) public String role;
    @Column(nullable=false) public boolean active=true;
    @Column(name="created_at", nullable=false) public OffsetDateTime createdAt=OffsetDateTime.now();
}
