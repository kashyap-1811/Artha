package com.artha.user.repository;

import com.artha.user.entity.User;
import lombok.NonNull;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<@NonNull User, @NonNull String> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
