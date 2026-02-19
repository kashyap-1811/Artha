package com.artha.user.services;

import com.artha.user.entity.User;


public interface IUserService {
    User create(User u);

    User update(User u);

    User getById(String id);

    void delete(String id);
}
