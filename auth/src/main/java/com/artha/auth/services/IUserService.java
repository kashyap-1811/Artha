package com.artha.auth.services;

import com.artha.auth.entity.User;

public interface IUserService {
    User create(User user);

    User update(User user);

    User getById(String id);

    void delete(String id);
}
