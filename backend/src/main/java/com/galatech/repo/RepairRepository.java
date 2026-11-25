package com.galatech.repo;
import com.galatech.model.Repair;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface RepairRepository extends JpaRepository<Repair,UUID> { Optional<Repair> findByTrackingCodeIgnoreCase(String code); List<Repair> findAllByOrderByCreatedAtDesc(); List<Repair> findByTechnician_IdOrderByCreatedAtDesc(UUID id); boolean existsByEquipment_IdAndTechnician_Id(UUID equipmentId,UUID technicianId); long countByStatus(String status); }
