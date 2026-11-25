package com.galatech.repo;
import com.galatech.model.RepairHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface HistoryRepository extends JpaRepository<RepairHistory,UUID> { List<RepairHistory> findByRepair_IdOrderByCreatedAtAsc(UUID repairId); List<RepairHistory> findByRepair_IdAndIsPublicTrueOrderByCreatedAtAsc(UUID repairId); }
