package com.galatech.api;

import com.galatech.model.*;
import com.galatech.repo.*;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.galatech.service.RepairService;
import java.util.*;

@RestController
public class OperationsController {
    private final UserRepository users; private final ClientRepository clients; private final EquipmentRepository equipment; private final RepairRepository repairs; private final RepairService repairService;
    public OperationsController(UserRepository u,ClientRepository c,EquipmentRepository e,RepairRepository r,RepairService repairService){users=u;clients=c;equipment=e;repairs=r;this.repairService=repairService;}

    @GetMapping("/api/clientes") @PreAuthorize("hasRole('ADMIN')")
    public List<Map<String,Object>> clients(){return clients.findAllByOrderByNameAsc().stream().map(c->Map.<String,Object>of("id",c.id,"name",c.name,"lastName",Objects.toString(c.lastName,""),"dni",Objects.toString(c.dni,""),"phone",Objects.toString(c.phone,""),"email",Objects.toString(c.email,""))).toList();}
    @PostMapping("/api/clientes") @PreAuthorize("hasRole('ADMIN')")
    public Map<String,Object> createClient(@Valid @RequestBody Contracts.ClientRequest r){Client c=new Client();c.name=r.name();c.lastName=r.lastName();c.dni=r.dni();c.phone=r.phone();c.email=r.email();c=clients.save(c);return Map.of("id",c.id,"name",c.name,"lastName",Objects.toString(c.lastName,""),"phone",Objects.toString(c.phone,""));}
    @PutMapping("/api/clientes/{id}") @PreAuthorize("hasRole('ADMIN')")
    public Map<String,Object> updateClient(@PathVariable UUID id,@Valid @RequestBody Contracts.ClientRequest r){Client c=clients.findById(id).orElseThrow(()->new IllegalArgumentException("Cliente no encontrado."));c.name=r.name();c.lastName=r.lastName();c.dni=r.dni();c.phone=r.phone();c.email=r.email();c=clients.save(c);return Map.of("id",c.id,"name",c.name,"lastName",Objects.toString(c.lastName,""),"phone",Objects.toString(c.phone,""));}
    @GetMapping("/api/equipos/{id}") @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    public Map<String,Object> equipment(@PathVariable UUID id,Authentication auth){AppUser me=current(auth);if(me.role.equals("TECHNICIAN")&&!repairs.existsByEquipment_IdAndTechnician_Id(id,me.id))throw new org.springframework.security.access.AccessDeniedException("No tienes acceso a este equipo.");Equipment e=equipment.findById(id).orElseThrow(()->new IllegalArgumentException("Equipo no encontrado."));return Map.of("id",e.id,"clientId",e.client.id,"kind",e.kind,"brand",e.brand,"model",Objects.toString(e.model,""),"serialNumber",Objects.toString(e.serialNumber,""),"description",Objects.toString(e.description,""));}
    @PostMapping("/api/equipos") @PreAuthorize("hasRole('ADMIN')")
    public Map<String,Object> createEquipment(@Valid @RequestBody Contracts.EquipmentRequest r){Client c=clients.findById(r.clientId()).orElseThrow(()->new IllegalArgumentException("Cliente no encontrado."));Equipment e=new Equipment();e.client=c;e.kind=r.kind();e.brand=r.brand();e.model=r.model();e.serialNumber=r.serialNumber();e.description=r.description();e=equipment.save(e);return Map.of("id",e.id,"clientId",c.id,"kind",e.kind,"brand",e.brand);}
    @GetMapping("/api/dashboard") @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    public Map<String,Object> dashboard(Authentication auth){AppUser me=current(auth);List<Repair> list=me.role.equals("ADMIN")?repairs.findAllByOrderByCreatedAtDesc():repairs.findByTechnician_IdOrderByCreatedAtDesc(me.id);Map<String,Long> counts=new LinkedHashMap<>();for(RepairStatus s:RepairStatus.values())counts.put(s.name(),list.stream().filter(r->r.status==s).count());return Map.of("total",list.size(),"received",counts.get("RECEIVED"),"inProgress",counts.get("DIAGNOSING")+counts.get("IN_REPAIR"),"completed",counts.get("REPAIRED"),"delivered",counts.get("DELIVERED"),"recent",list.stream().limit(6).map(r->Contracts.RepairView.of(r,List.of())).toList());}

    @GetMapping("/api/reparaciones") @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    public List<Contracts.RepairView> listRepairs(Authentication auth){return repairService.list(current(auth));}
    @GetMapping("/api/reparaciones/{id}") @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN')")
    public Contracts.RepairView repair(@PathVariable UUID id,Authentication auth){return repairService.get(id,current(auth));}
    @PostMapping("/api/reparaciones") @PreAuthorize("hasRole('ADMIN')")
    public Contracts.RepairView createRepair(@Valid @RequestBody Contracts.RepairRequest request,Authentication auth){return repairService.create(request,current(auth));}
    @PatchMapping("/api/reparaciones/{id}/asignacion") @PreAuthorize("hasRole('ADMIN')")
    public Contracts.RepairView assignRepair(@PathVariable UUID id,@Valid @RequestBody Contracts.AssignmentRequest request,Authentication auth){return repairService.assign(id,request,current(auth));}
    @PatchMapping("/api/reparaciones/{id}/estado") @PreAuthorize("hasRole('TECHNICIAN')")
    public Contracts.RepairView updateStatus(@PathVariable UUID id,@Valid @RequestBody Contracts.StatusRequest request,Authentication auth){return repairService.updateStatus(id,request,current(auth));}
    @GetMapping("/api/seguimiento/{code}")
    public Contracts.PublicTracking tracking(@PathVariable String code){return repairService.tracking(code);}

    private AppUser current(Authentication a){return users.findByEmailIgnoreCase(a.getName()).orElseThrow(()->new IllegalArgumentException("Sesión inválida."));}
}
