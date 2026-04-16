package org.vidrec.userservice.event;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserEvent {
    private String eventId;
    private UUID userId;
    private String eventType;
    private String username;
    private List<String> interests;
    private List<String> preferences;
    private String reason;
    private Instant timestamp;
}
