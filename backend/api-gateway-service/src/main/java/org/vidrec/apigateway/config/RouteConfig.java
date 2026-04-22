package org.vidrec.apigateway.config;

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
    RouterFunction<?> gatewayRoutes(
        @Value("${USER_SERVICE_URL:http://localhost:8081}") String userServiceUrl,
        @Value("${VIDEO_SERVICE_URL:http://localhost:8082}") String videoServiceUrl,
        @Value("${REC_SERVICE_URL:http://localhost:8083}") String recommendationServiceUrl
    ) {
        RouterFunction<?> userRoutes = route("user-service-public")
            .POST("/users/register", http())
            .POST("/users/login", http())
            .before(uri(userServiceUrl))
            .build()
            .andOther(
                route("user-service-protected")
                    .route(path("/admin/users"), http())
                    .route(path("/users/**"), http())
                    .route(path("/admin/users/**"), http())
                    .before(uri(userServiceUrl))
                    .build()
            );

        RouterFunction<?> videoRoutes = route("video-service-public")
            .GET("/videos/catalog", http())
            .GET("/videos/search", http())
            .GET("/videos/user/{userId}", http())
            .GET("/videos/{videoId}", http())
            .before(uri(videoServiceUrl))
            .build()
            .andOther(
                route("video-service-protected")
                    .route(path("/admin/videos"), http())
                    .route(path("/videos/**"), http())
                    .route(path("/admin/videos/**"), http())
                    .before(uri(videoServiceUrl))
                    .build()
            );

        RouterFunction<?> recommendationRoutes = route("recommendation-service-public")
            .GET("/recommendations/cold/{categoryId}", http())
            .GET("/recommendations/similar/{videoId}", http())
            .before(uri(recommendationServiceUrl))
            .build()
            .andOther(
                route("recommendation-service-protected")
                    .route(path("/recommendations/**"), http())
                    .before(uri(recommendationServiceUrl))
                    .build()
            );

        return userRoutes.andOther(videoRoutes).andOther(recommendationRoutes);
    }
}
