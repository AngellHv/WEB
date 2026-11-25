package com.galatech.api;

import com.galatech.model.*;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;

public final class Contracts {
    private Contracts() {}
    public record LoginRequest(@Email(message="Ingresa un correo electrónico válido.") @NotBlank(message="Ingresa el correo electrónico.") String email, @NotBlank(message="Ingresa la contraseña.") String password) {}
    public record UserRequest(
        @NotBlank(message="Ingresa el nombre del técnico.")
        @Pattern(regexp="^[\\p{L}][\\p{L}\\p{M}]*(?: +[\\p{L}][\\p{L}\\p{M}]*)*$", message="Usa solo letras y espacios.") String name,
        @Email(message="Ingresa un correo electrónico válido.") @NotBlank(message="Ingresa el correo electrónico.") String email,
        @Pattern(regexp="^$|^(?=.{10,}$)(?=.*\\S).*$", message="La contraseña debe tener al menos 10 caracteres y no puede ser solo espacios.") String password,
        Boolean active) {}
    public record ClientRequest(
        @NotBlank(message="Ingresa los nombres.")
        @Pattern(regexp="^[\\p{L}][\\p{L}\\p{M}]*(?: +[\\p{L}][\\p{L}\\p{M}]*)*$", message="Usa solo letras y espacios.") String name,
        @NotBlank(message="Ingresa los apellidos.")
        @Pattern(regexp="^[\\p{L}][\\p{L}\\p{M}]*(?: +[\\p{L}][\\p{L}\\p{M}]*)*$", message="Usa solo letras y espacios.") String lastName,
        @Pattern(regexp="^$|^[0-9]{8}$", message="El DNI debe tener exactamente 8 dígitos.") String dni,
        @Pattern(regexp="^$|^[0-9]{9}$", message="El teléfono debe tener exactamente 9 dígitos.") String phone,
        @Pattern(regexp="^$|^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message="Ingresa un correo electrónico válido.") String email) {}
    public record EquipmentRequest(@NotNull(message="Selecciona un cliente.") UUID clientId, @NotBlank(message="Selecciona el tipo de equipo.") String kind, @NotBlank(message="Ingresa la marca del equipo.") String brand, String model, String serialNumber, String description) {}
    public record RepairRequest(@NotNull(message="Selecciona un cliente.") UUID clientId, @NotNull(message="Selecciona un técnico.") UUID technicianId, @NotBlank(message="Selecciona el tipo de equipo.") String equipmentKind, @NotBlank(message="Ingresa la marca del equipo.") String equipmentBrand, String equipmentModel, String equipmentSerialNumber, String equipmentDescription, @NotBlank(message="Describe el problema reportado.") String problemReported, String diagnosis, String internalObservations, String customerObservations, LocalDate estimatedDelivery) {}
    public record AssignmentRequest(@NotNull(message="Selecciona un técnico.") UUID technicianId, LocalDate estimatedDelivery) {}
    public record StatusRequest(@NotNull(message="Selecciona un estado.") RepairStatus status, String observation, String customerObservation, String diagnosis, LocalDate estimatedDelivery) {}
    public record UserView(UUID id, String name, String email, String role, boolean active, OffsetDateTime createdAt) {
        public static UserView of(AppUser u) { return new UserView(u.id,u.name,u.email,u.role,u.active,u.createdAt); }
    }
    public record HistoryView(String previousStatus, String status, String label, String observation, String technician, OffsetDateTime createdAt) {
        public static HistoryView of(RepairHistory h) { return new HistoryView(h.previousStatus,h.status,RepairStatus.valueOf(h.status).label,h.observation,h.actor==null?null:h.actor.name,h.createdAt); }
    }
    public record RepairView(UUID id, String trackingCode, UUID clientId, String clientName, String clientPhone, UUID equipmentId, String equipmentKind, String equipmentBrand, String equipmentModel, String serialNumber, String problemReported, String diagnosis, String internalObservations, String customerObservations, String status, String statusLabel, String technician, UUID technicianId, LocalDate estimatedDelivery, OffsetDateTime createdAt, List<HistoryView> history) {
        public static RepairView of(Repair r, List<HistoryView> history) { return new RepairView(r.id,r.trackingCode,r.client.id,r.client.name+" "+Objects.toString(r.client.lastName,""),r.client.phone,r.equipment.id,r.equipment.kind,r.equipment.brand,r.equipment.model,r.equipment.serialNumber,r.problemReported,r.diagnosis,r.internalObservations,r.customerObservations,r.status.name(),r.status.label,r.technician==null?null:r.technician.name,r.technician==null?null:r.technician.id,r.estimatedDelivery,r.createdAt,history); }
    }
    public record PublicTracking(String trackingCode, String status, String statusLabel, String equipment, String brand, String model, String diagnosis, String customerObservations, LocalDate estimatedDelivery, OffsetDateTime receivedAt, List<HistoryView> history) {
        public static PublicTracking of(Repair r, List<HistoryView> history) { return new PublicTracking(r.trackingCode,r.status.name(),r.status.label,r.equipment.kind,r.equipment.brand,r.equipment.model,r.diagnosis,r.customerObservations,r.estimatedDelivery,r.createdAt,history); }
    }
}
