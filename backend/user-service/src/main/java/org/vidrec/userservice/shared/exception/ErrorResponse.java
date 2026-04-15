package org.vidrec.userservice.shared.exception;

import java.util.List;

public record ErrorResponse(ErrorBody error) {

    public record ErrorBody(String code, String message, List<ErrorDetail> details) {}
}