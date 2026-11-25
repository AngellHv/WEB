package com.galatech.repo;
import com.galatech.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface ClientRepository extends JpaRepository<Client,UUID> { List<Client> findAllByOrderByNameAsc(); }
