package org.vidrec.videoservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.vidrec.videoservice.config.DotenvEnvironmentListener;

@SpringBootApplication
public class VideoServiceApplication {

    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(VideoServiceApplication.class);
        application.addListeners(new DotenvEnvironmentListener());
        application.run(args);
    }

}
