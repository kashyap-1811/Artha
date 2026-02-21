package com.artha.user.services.impl;

import com.artha.user.entity.*;
import com.artha.user.repository.CompanyRepository;
import com.artha.user.repository.UserCompanyRepository;
import com.artha.user.repository.UserRepository;
import com.artha.user.services.IUserService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService implements IUserService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final UserCompanyRepository userCompanyRepository;

    public User create(User user) {

        if (userRepository.existsByEmail(user.getEmail())) {
            throw new IllegalStateException("Email already registered");
        }

        // Password should be hashed by API Gateway or Caller before reaching here if needed,
        // OR simply stored as is if this service assumes trusted input.
        // For now, we store as provided (assuming Gateway hashed it or we don't handle auth here).

        User savedUser = userRepository.save(user);
        ensurePersonalCompany(savedUser.getId());
        return savedUser;
    }

    @Override
    public Company ensurePersonalCompany(String userId) {
        User persistedUser = userRepository.findById(userId)
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + userId)
                );

        return userCompanyRepository
                .findFirstByUser_IdAndCompany_TypeAndActiveTrue(
                        persistedUser.getId(),
                        CompanyType.PERSONAL
                )
                .map(UserCompany::getCompany)
                .orElseGet(() -> {
                    Company personalCompany = Company.builder()
                            .name(persistedUser.getFullName() + "'s Personal Account")
                            .type(CompanyType.PERSONAL)
                            .build();

                    companyRepository.save(personalCompany);

                    UserCompany uc = UserCompany.builder()
                            .role(UserCompanyRole.OWNER)
                            .active(true)
                            .build();

                    persistedUser.addUserCompany(uc);
                    personalCompany.addUserCompany(uc);

                    userCompanyRepository.save(uc);

                    return personalCompany;
                });
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
