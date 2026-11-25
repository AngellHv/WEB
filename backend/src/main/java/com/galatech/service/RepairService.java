package com.galatech.service;

import com.galatech.api.Contracts;
import com.galatech.model.*;
import com.galatech.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class RepairService {
    private final ClientRepository clients; private final EquipmentRepository equipment; private final RepairRepository repairs; private final HistoryRepository history; private final UserRepository users;
    private final SecureRandom random=new SecureRandom();
    public RepairService(ClientRepository clients,EquipmentRepository equipment,RepairRepository repairs,HistoryRepository history,UserRepository users){this.clients=clients;this.equipment=equipment;this.repairs=repairs;this.history=history;this.users=users;}

    public List<Contracts.RepairView> list(AppUser actor){var list=actor.role.equals("ADMIN")?repairs.findAllByOrderByCreatedAtDesc():repairs.findByTechnician_IdOrderByCreatedAtDesc(actor.id);return list.stream().map(r->view(r,false)).toList();}
    public Contracts.RepairView get(UUID id,AppUser actor){Repair r=find(id);authorize(r,actor);return view(r,true);}
    @Transactional public Contracts.RepairView create(Contracts.RepairRequest request,AppUser actor){
        Client client=clients.findById(request.clientId()).orElseThrow(()->new IllegalArgumentException("Cliente no encontrado."));
        if(!actor.role.equals("ADMIN"))throw new org.springframework.security.access.AccessDeniedException("Solo el administrador puede registrar y asignar reparaciones.");
        AppUser technician=users.findById(request.technicianId()).orElseThrow(()->new IllegalArgumentException("Técnico no encontrado."));
        if(!technician.role.equals("TECHNICIAN")||!technician.active)throw new IllegalArgumentException("Selecciona un técnico activo.");
        Equipment eq=new Equipment();eq.client=client;eq.kind=request.equipmentKind();eq.brand=request.equipmentBrand();eq.model=request.equipmentModel();eq.serialNumber=request.equipmentSerialNumber();eq.description=request.equipmentDescription();eq=equipment.save(eq);
        Repair r=new Repair();r.client=client;r.equipment=eq;r.technician=technician;r.trackingCode=code();r.status=RepairStatus.RECEIVED;r.problemReported=request.problemReported();r.diagnosis=request.diagnosis();r.internalObservations=request.internalObservations();r.customerObservations=request.customerObservations();r.estimatedDelivery=request.estimatedDelivery();r=repairs.save(r);addHistory(r,actor,null,r.status,request.customerObservations());return view(r,true);
    }
    @Transactional public Contracts.RepairView assign(UUID id,Contracts.AssignmentRequest request,AppUser actor){
        if(!actor.role.equals("ADMIN"))throw new org.springframework.security.access.AccessDeniedException("Solo el administrador puede asignar reparaciones.");
        Repair r=find(id);AppUser technician=users.findById(request.technicianId()).orElseThrow(()->new IllegalArgumentException("Técnico no encontrado."));
        if(!technician.role.equals("TECHNICIAN")||!technician.active)throw new IllegalArgumentException("Selecciona un técnico activo.");
        r.technician=technician;r.estimatedDelivery=request.estimatedDelivery();r.updatedAt=OffsetDateTime.now();return view(repairs.save(r),true);
    }
    @Transactional public Contracts.RepairView updateStatus(UUID id,Contracts.StatusRequest request,AppUser actor){
        Repair r=find(id);authorize(r,actor);RepairStatus previous=r.status;
        if(request.status().ordinal()<previous.ordinal()||request.status().ordinal()>previous.ordinal()+1)throw new IllegalArgumentException("La reparación debe avanzar a la siguiente etapa.");
        r.status=request.status();
        if(request.diagnosis()!=null)r.diagnosis=request.diagnosis();if(request.customerObservation()!=null)r.customerObservations=request.customerObservation();r.estimatedDelivery=request.estimatedDelivery();
        r.updatedAt=OffsetDateTime.now();if(r.status==RepairStatus.DELIVERED)r.deliveredAt=OffsetDateTime.now();r=repairs.save(r);addHistory(r,actor,previous,r.status,request.observation());return view(r,true);
    }
    public Contracts.PublicTracking tracking(String code){Repair r=repairs.findByTrackingCodeIgnoreCase(code.trim()).orElseThrow(()->new IllegalArgumentException("No se encontró ninguna reparación con ese código."));var events=history.findByRepair_IdAndIsPublicTrueOrderByCreatedAtAsc(r.id).stream().map(Contracts.HistoryView::of).toList();return Contracts.PublicTracking.of(r,events);}
    private Repair find(UUID id){return repairs.findById(id).orElseThrow(()->new IllegalArgumentException("Reparación no encontrada."));}
    private void authorize(Repair repair,AppUser actor){if(actor.role.equals("TECHNICIAN")&&(repair.technician==null||!repair.technician.id.equals(actor.id)))throw new org.springframework.security.access.AccessDeniedException("No tienes acceso a esta reparación.");}
    private Contracts.RepairView view(Repair repair,boolean includeHistory){var events=includeHistory?history.findByRepair_IdOrderByCreatedAtAsc(repair.id).stream().map(Contracts.HistoryView::of).toList():List.<Contracts.HistoryView>of();return Contracts.RepairView.of(repair,events);}
    private void addHistory(Repair r,AppUser actor,RepairStatus previous,RepairStatus next,String observation){RepairHistory h=new RepairHistory();h.repair=r;h.actor=actor;h.previousStatus=previous==null?null:previous.name();h.status=next.name();h.observation=observation;h.isPublic=true;history.save(h);}
    private String code(){String alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";String value;do{StringBuilder b=new StringBuilder("GT-");for(int i=0;i<8;i++)b.append(alphabet.charAt(random.nextInt(alphabet.length())));value=b.toString();}while(repairs.findByTrackingCodeIgnoreCase(value).isPresent());return value;}
}
