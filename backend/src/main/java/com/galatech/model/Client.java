package com.galatech.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity @Table(name="clientes")
public class Client {
    @Id @GeneratedValue(strategy=GenerationType.UUID) public UUID id;
    @Column(nullable=false) public String name;
    @Column(name="last_name") public String lastName;
    public String dni; public String email; public String phone;
    @Column(name="created_at") public OffsetDateTime createdAt=OffsetDateTime.now();
}
