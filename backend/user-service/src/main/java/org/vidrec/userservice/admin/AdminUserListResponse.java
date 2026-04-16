package org.vidrec.userservice.admin;

import java.util.List;

public record AdminUserListResponse(
    List<AdminUserSummaryResponse> users,
    int page,
    int size,
    long totalElements
) {}
