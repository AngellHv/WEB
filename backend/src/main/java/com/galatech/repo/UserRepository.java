package com.galatech.repo;
import com.galatech.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface UserRepository extends JpaRepository<AppUser,UUID> { Optional<AppUser> findByEmailIgnoreCase(String email); List<AppUser> findByRoleOrderByName(String role); }
