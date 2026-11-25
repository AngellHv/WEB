package com.galatech.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity @Table(name="equipos")
public class Equipment {
    @Id @GeneratedValue(strategy=GenerationType.UUID) public UUID id;
    @ManyToOne(optional=false) @JoinColumn(name="client_id",nullable=false) public Client client;
    @Column(nullable=false) public String kind;
    @Column(nullable=false) public String brand;
    public String model;
    @Column(name="serial_number") public String serialNumber;
    public String description;
    @Column(name="created_at") public OffsetDateTime createdAt=OffsetDateTime.now();
}
