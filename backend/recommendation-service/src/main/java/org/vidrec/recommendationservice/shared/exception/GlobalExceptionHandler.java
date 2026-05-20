package org.vidrec.recommendationservice.shared.exception;

import jakarta.validation.ConstraintViolationException;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorResponse> handleApiException(ApiException ex) {
        return ResponseEntity.status(ex.getStatus())
            .body(error(ex.getCode(), ex.getMessage(), ex.getDetails()));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        List<ErrorDetail> details = ex.getConstraintViolations().stream()
            .map(violation -> new ErrorDetail(lastPathNode(violation.getPropertyPath().toString()), violation.getMessage()))
            .toList();
        return ResponseEntity.badRequest()
            .body(error("VALIDATION_ERROR", "Request validation failed.", details));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        List<ErrorDetail> details = ex.getBindingResult().getFieldErrors().stream()
            .map(this::toDetail)
            .toList();
        return ResponseEntity.badRequest()
            .body(error("VALIDATION_ERROR", "Request validation failed.", details));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        ErrorDetail detail = new ErrorDetail(ex.getName(), "invalid value");
        return ResponseEntity.badRequest()
            .body(error("VALIDATION_ERROR", "Request validation failed.", List.of(detail)));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        log.error("Unhandled recommendation-service exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(error("INTERNAL_ERROR", "Unexpected internal error.", List.of()));
    }

    private ErrorResponse error(String code, String message, List<ErrorDetail> details) {
        return new ErrorResponse(new ErrorResponse.ErrorBody(code, message, details));
    }

    private ErrorDetail toDetail(FieldError fieldError) {
        return new ErrorDetail(fieldError.getField(), fieldError.getDefaultMessage());
    }

    private String lastPathNode(String path) {
        int dot = path.lastIndexOf('.');
        return dot >= 0 ? path.substring(dot + 1) : path;
    }
}
