package com.artha.auth.services;

import com.artha.auth.entity.User;

public interface IUserService {
    User create(User u);

    User update(User u);

    User getById(String id);

    void delete(String id);
}
