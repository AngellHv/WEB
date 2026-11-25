package com.galatech.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity @Table(name="historial_reparaciones")
public class RepairHistory {
    @Id @GeneratedValue(strategy=GenerationType.UUID) public UUID id;
    @ManyToOne(optional=false) @JoinColumn(name="repair_id",nullable=false) public Repair repair;
    @ManyToOne @JoinColumn(name="actor_id") public AppUser actor;
    @Column(name="previous_status") public String previousStatus;
    @Column(nullable=false) public String status;
    public String observation;
    @Column(name="is_public",nullable=false) public boolean isPublic=true;
    @Column(name="created_at") public OffsetDateTime createdAt=OffsetDateTime.now();
}
