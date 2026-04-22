package org.vidrec.apigateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.vidrec.apigateway.config.DotenvEnvironmentListener;

@SpringBootApplication
public class ApiGatewayApplication {

    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(ApiGatewayApplication.class);
        application.addListeners(new DotenvEnvironmentListener());
        application.run(args);
    }

}
