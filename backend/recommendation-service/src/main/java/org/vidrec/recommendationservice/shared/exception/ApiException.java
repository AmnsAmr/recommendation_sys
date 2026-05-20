package org.vidrec.recommendationservice.shared.exception;

import java.util.List;
import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

    private final String code;
    private final HttpStatus status;
    private final List<ErrorDetail> details;

    public ApiException(String code, String message, HttpStatus status) {
        this(code, message, status, List.of());
    }

    public ApiException(String code, String message, HttpStatus status, ErrorDetail detail) {
        this(code, message, status, List.of(detail));
    }

    public ApiException(String code, String message, HttpStatus status, List<ErrorDetail> details) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details == null ? List.of() : List.copyOf(details);
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public List<ErrorDetail> getDetails() {
        return details;
    }
}
