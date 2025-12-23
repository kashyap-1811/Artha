package com.artha.auth.services.impl;

import com.artha.auth.entity.*;
import com.artha.auth.repository.CompanyRepository;
import com.artha.auth.repository.UserCompanyRepository;
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
    private final CompanyRepository companyRepository;
    private final UserCompanyRepository userCompanyRepository;

    @Override
    public User create(User user) {

        if (userRepository.existsByEmail(user.getEmail())) {
            throw new IllegalStateException("Email already registered");
        }

        // 1️⃣ Save user
        User savedUser = userRepository.save(user);

        // 2️⃣ Create PERSONAL company
        Company personalCompany = Company.builder()
                .name(savedUser.getFullName() + "'s Personal Account")
                .type(CompanyType.PERSONAL)
                .build();

        companyRepository.save(personalCompany);

        // 3️⃣ Link OWNER
        UserCompany uc = UserCompany.builder()
                .role(UserCompanyRole.OWNER)
                .active(true)
                .build();

        savedUser.addUserCompany(uc);
        personalCompany.addUserCompany(uc);

        userCompanyRepository.save(uc);

        return savedUser;
    }

    @Override
    public User update(User user) {

        if (user.getId() == null) {
            throw new IllegalStateException("User ID must be provided");
        }

        User existing = userRepository.findById(user.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + user.getId())
                );

        existing.setFullName(user.getFullName());
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