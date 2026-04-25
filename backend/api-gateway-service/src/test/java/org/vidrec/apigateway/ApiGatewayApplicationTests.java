package org.vidrec.apigateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(
    properties = {
        "JWT_SECRET=01234567890123456789012345678901",
        "INTERNAL_SERVICE_TOKEN=test-internal-token",
        "USER_SERVICE_URL=http://localhost:8081",
        "VIDEO_SERVICE_URL=http://localhost:8082",
        "REC_SERVICE_URL=http://localhost:8083"
    }
)
class ApiGatewayApplicationTests {

    @Test
    void contextLoads() {
    }

}
