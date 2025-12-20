package com.artha.auth.controller;

import com.artha.auth.entity.User;
import com.artha.auth.services.IUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequiredArgsConstructor
@RequestMapping("/user")
public class UserController {

    private final IUserService userService;

    @PostMapping
    public ResponseEntity<User> create(@RequestBody User user) {
        User created = userService.create(user);

        return ResponseEntity
                .created(URI.create("/user/" + created.getId()))
                .body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> update(
            @PathVariable String id,
            @RequestBody User user
    ) {
        user.setId(id); // enforce path id
        return ResponseEntity.ok(userService.update(user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}