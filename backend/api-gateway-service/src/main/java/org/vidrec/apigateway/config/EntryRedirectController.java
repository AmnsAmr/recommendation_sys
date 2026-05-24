package org.vidrec.apigateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class EntryRedirectController {

    private final String frontendUrl;

    public EntryRedirectController(@Value("${FRONTEND_URL:http://localhost:3000}") String frontendUrl) {
        this.frontendUrl = frontendUrl;
    }

    @GetMapping("/")
    public String root() {
        return "redirect:" + frontendUrl + "/login";
    }
}
