package org.vidrec.userservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.vidrec.userservice.config.DotenvEnvironmentListener;

@SpringBootApplication
public class UserServiceApplication {

    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(UserServiceApplication.class);
        application.addListeners(new DotenvEnvironmentListener());
        application.run(args);
    }

}
