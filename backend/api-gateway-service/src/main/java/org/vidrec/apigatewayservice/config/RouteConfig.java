package org.vidrec.apigatewayservice.config;

import static org.springframework.cloud.gateway.server.mvc.filter.BeforeFilterFunctions.uri;
import static org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions.route;
import static org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions.http;
import static org.springframework.web.servlet.function.RequestPredicates.path;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.RouterFunction;

@Configuration
public class RouteConfig {

    @Bean
    public RouterFunction<?> gatewayRoutes(
        @Value("${USER_SERVICE_URL:http://localhost:8081}") String userServiceUrl,
        @Value("${VIDEO_SERVICE_URL:http://localhost:8082}") String videoServiceUrl,
        @Value("${REC_SERVICE_URL:http://localhost:8083}") String recommendationServiceUrl
    ) {
        RouterFunction<?> userRoutes = route("user-service-routes")
            .route(path("/users/**"), http())
            .before(uri(userServiceUrl))
            .build();

        RouterFunction<?> userAdminRoutes = route("user-admin-routes")
            .route(path("/admin/users/**"), http())
            .before(uri(userServiceUrl))
            .build();

        RouterFunction<?> videoRoutes = route("video-service-routes")
            .route(path("/videos/**"), http())
            .before(uri(videoServiceUrl))
            .build();

        RouterFunction<?> videoAdminRoutes = route("video-admin-routes")
            .route(path("/admin/videos/**"), http())
            .before(uri(videoServiceUrl))
            .build();

        RouterFunction<?> recommendationRoutes = route("recommendation-service-routes")
            .route(path("/recommendations/**"), http())
            .before(uri(recommendationServiceUrl))
            .build();

        return userRoutes
            .andOther(userAdminRoutes)
            .andOther(videoRoutes)
            .andOther(videoAdminRoutes)
            .andOther(recommendationRoutes);
    }
}
