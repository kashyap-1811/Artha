package com.artha.user.services;

import com.artha.user.entity.Company;
import com.artha.user.entity.User;


public interface IUserService {
    User create(User u);

    Company ensurePersonalCompany(String userId);

    User update(User u);

    User getById(String id);

    User getByEmail(String email);

    void delete(String id);
}
