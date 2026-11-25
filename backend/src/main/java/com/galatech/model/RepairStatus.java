package com.galatech.model;

public enum RepairStatus {
    RECEIVED("Recibido"), DIAGNOSING("En diagnóstico"), IN_REPAIR("En reparación"), REPAIRED("Reparación terminada"), DELIVERED("Entregado");
    public final String label;
    RepairStatus(String label) { this.label = label; }
}
