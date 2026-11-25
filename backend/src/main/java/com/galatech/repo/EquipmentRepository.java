package com.galatech.repo;
import com.galatech.model.Equipment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface EquipmentRepository extends JpaRepository<Equipment,UUID> { List<Equipment> findByClient_Id(UUID clientId); }
