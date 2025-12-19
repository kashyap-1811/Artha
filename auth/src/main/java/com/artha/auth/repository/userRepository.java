package com.artha.auth.repository;

import com.artha.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface userRepository extends JpaRepository<User, String> {
}
