package com.galatech.model;

import jakarta.persistence.*;
import java.time.*;
import java.util.UUID;

@Entity @Table(name="reparaciones")
public class Repair {
    @Id @GeneratedValue(strategy=GenerationType.UUID) public UUID id;
    @Column(name="tracking_code",nullable=false,unique=true) public String trackingCode;
    @ManyToOne(optional=false) @JoinColumn(name="client_id",nullable=false) public Client client;
    @ManyToOne(optional=false) @JoinColumn(name="equipment_id",nullable=false) public Equipment equipment;
    @ManyToOne @JoinColumn(name="technician_id") public AppUser technician;
    @Enumerated(EnumType.STRING) @Column(nullable=false) public RepairStatus status=RepairStatus.RECEIVED;
    @Column(name="problem_reported") public String problemReported;
    public String diagnosis;
    @Column(name="internal_observations") public String internalObservations;
    @Column(name="customer_observations") public String customerObservations;
    @Column(name="created_at") public OffsetDateTime createdAt=OffsetDateTime.now();
    @Column(name="updated_at") public OffsetDateTime updatedAt=OffsetDateTime.now();
    @Column(name="estimated_delivery") public LocalDate estimatedDelivery;
    @Column(name="delivered_at") public OffsetDateTime deliveredAt;
}
