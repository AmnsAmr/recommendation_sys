package org.vidrec.videoservice.shared.exception;

import java.util.List;

public record ErrorResponse(ErrorBody error) {

    public record ErrorBody(String code, String message, List<ErrorDetail> details) {}
}
