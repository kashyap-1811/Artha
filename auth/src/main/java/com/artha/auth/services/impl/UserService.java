package com.artha.auth.services.impl;

import com.artha.auth.entity.User;
import com.artha.auth.repository.UserRepository;
import com.artha.auth.services.IUserService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService implements IUserService {

    private final UserRepository userRepository;

    @Override
    public User create(User user) {

        if (userRepository.existsByEmail(user.getEmail())) {
            throw new IllegalStateException("Email already registered");
        }

        return userRepository.save(user);
    }

    @Override
    public User update(User user) {

        if (user.getId() == null) {
            throw new IllegalStateException("User ID must be provided for update");
        }

        User existing = userRepository.findById(user.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + user.getId())
                );

        existing.setFullname(user.getFullname());
        existing.setEmail(user.getEmail());
        existing.setActive(user.isActive());

        return userRepository.save(existing);
    }

    @Override
    public User getById(String id) {

        return userRepository.findById(id)
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + id)
                );
    }

    @Override
    public void delete(String id) {

        if (!userRepository.existsById(id)) {
            throw new EntityNotFoundException("User not found: " + id);
        }

        userRepository.deleteById(id);
    }
}