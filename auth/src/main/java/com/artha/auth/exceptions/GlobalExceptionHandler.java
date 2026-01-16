package com.artha.auth.exceptions;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // 404 - Entity Not Found
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiError> handleEntityNotFound(EntityNotFoundException ex) {
        ApiError apiError = new ApiError(
                ex.getMessage(),
                HttpStatus.NOT_FOUND
        );
        return new ResponseEntity<>(apiError, HttpStatus.NOT_FOUND);
    }

    // 400 - Bad Request
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiError> handleIllegalState(IllegalStateException ex) {
        ApiError apiError = new ApiError(
                ex.getMessage(),
                HttpStatus.BAD_REQUEST
        );
        return new ResponseEntity<>(apiError, HttpStatus.BAD_REQUEST);
    }

    // 401 - Authentication Failed
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handleAuthenticationException(AuthenticationException ex) {
        ApiError apiError = new ApiError(
                "Authentication failed: " + ex.getMessage(),
                HttpStatus.UNAUTHORIZED
        );
        return new ResponseEntity<>(apiError, HttpStatus.UNAUTHORIZED);
    }

    // 403 - Access Denied
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDeniedException(AccessDeniedException ex) {
        ApiError apiError = new ApiError(
                "Access denied: Insufficient permissions",
                HttpStatus.FORBIDDEN
        );
        return new ResponseEntity<>(apiError, HttpStatus.FORBIDDEN);
    }

    // 500 - Generic Exception
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGenericException(Exception ex) {
        ApiError apiError = new ApiError(
                "An unexpected error occurred: " + ex.getMessage(),
                HttpStatus.INTERNAL_SERVER_ERROR
        );
        return new ResponseEntity<>(apiError, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}