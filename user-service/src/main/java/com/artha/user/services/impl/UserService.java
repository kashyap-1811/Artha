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
        long dbSaveStart = System.currentTimeMillis();
        try {
            // Part 3 Optimization: Remove existsByEmail check and rely on DB UNIQUE constraint
            User savedUser = userRepository.save(user);
            // Flush to catch constraint violation during save
            userRepository.flush();
            long dbSaveEnd = System.currentTimeMillis();
            System.out.println("====== DB Execution Time [Create User Optimized]: Save/Flush " + (dbSaveEnd - dbSaveStart) + "ms ======");
            
            ensurePersonalCompany(savedUser.getId());
            return savedUser;
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            throw new com.artha.user.exception.DuplicateResourceException("Email already exists");
        }
    }

    @Override
    public Company ensurePersonalCompany(String userId) {
        long dbStart1 = System.currentTimeMillis();
        // We still need the User entity here to build the personal company name and associate it.
        User persistedUser = userRepository.findById(userId)
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + userId)
                );
        long dbEnd1 = System.currentTimeMillis();

        long dbStart2 = System.currentTimeMillis();
        Company result = userCompanyRepository
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
        long dbEnd2 = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Ensure Personal Company]: User lookup " + (dbEnd1 - dbStart1) + "ms, Company setup " + (dbEnd2 - dbStart2) + "ms ======");
        return result;
    }

    @Override
    public User update(User user) {

        if (user.getId() == null) {
            throw new IllegalStateException("User ID must be provided");
        }

        long dbFindStart = System.currentTimeMillis();
        User existing = userRepository.findById(user.getId())
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + user.getId())
                );
        long dbFindEnd = System.currentTimeMillis();

        existing.setFullName(user.getFullName());
        existing.setActive(user.isActive());

        long dbSaveStart = System.currentTimeMillis();
        User saved = userRepository.save(existing);
        long dbSaveEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Update User]: Find " + (dbFindEnd - dbFindStart) + "ms, Save " + (dbSaveEnd - dbSaveStart) + "ms ======");

        return saved;
    }

    @Override
    public User getById(String id) {
        long dbStart = System.currentTimeMillis();
        User user = userRepository.findById(id)
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found: " + id)
                );
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Get User By ID]: " + (dbEnd - dbStart) + "ms ======");
        return user;
    }

    @Override
    public User getByEmail(String email) {
        long dbStart = System.currentTimeMillis();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new EntityNotFoundException("User not found with email: " + email)
                );
        long dbEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Get User By Email]: " + (dbEnd - dbStart) + "ms ======");
        return user;
    }

    @Override
    public void delete(String id) {
        long dbDeleteStart = System.currentTimeMillis();
        try {
            // Part 3 Optimization: Remove existsById check and call deleteById directly
            userRepository.deleteById(id);
            // Explicitly flush to catch issues if needed, though deleteById usually triggers execution
            userRepository.flush();
        } catch (org.springframework.dao.EmptyResultDataAccessException | EntityNotFoundException ex) {
            throw new EntityNotFoundException("User not found: " + id);
        }
        long dbDeleteEnd = System.currentTimeMillis();
        System.out.println("====== DB Execution Time [Delete User Optimized]: Delete/Flush " + (dbDeleteEnd - dbDeleteStart) + "ms ======");
    }
}
