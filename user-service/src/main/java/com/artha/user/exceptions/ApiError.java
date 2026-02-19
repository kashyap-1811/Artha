package com.artha.user.exceptions;

import org.springframework.http.HttpStatus;

import java.time.Instant;

public class ApiError {

    private Instant timestamp;
    private String message;
    private HttpStatus status;

    public ApiError(String message, HttpStatus status) {
        this.timestamp = Instant.now();
        this.message = message;
        this.status = status;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public String getMessage() {
        return message;
    }

    public HttpStatus getStatus() {
        return status;
    }
}