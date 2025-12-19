package com.artha.auth.services.impl;

import com.artha.auth.entity.User;
import com.artha.auth.repository.UserRepository;
import com.artha.auth.services.IUserService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService implements IUserService {

    final private UserRepository userRepository;

    @Override
    public User create(User user) {
        return userRepository.save(user);
    }

    @Override
    public User update(User user) {
        return userRepository.save(user);
    }

    @Override
    public User getById(String id) {
        return userRepository.getReferenceById(id);
    }

    @Override
    public void delete(String id) {
        userRepository.deleteById(id);
    }
}
