package org.vidrec.userservice.admin;

import java.util.List;

public record AdminDashboardResponse(
    long totalUsers,
    long activeUsers,
    long bannedUsers,
    long adminUsers,
    long newUsersLast7Days,
    List<AdminDashboardRecentUserResponse> latestUsers
) {}
