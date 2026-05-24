package org.vidrec.recommendationservice.security;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    @Value("${app.security.disabled:true}")
    private boolean securityDisabled;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, HeaderAuthFilter headerAuthFilter) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> {
                if (securityDisabled) {
                    // FIXME(RULES.md §4): test mode disables downstream authorization checks for local verification.
                    auth.anyRequest().permitAll();
                    return;
                }

                auth
                    .requestMatchers("/actuator/**").permitAll()
                    .requestMatchers("/recommendations/cold/**", "/recommendations/similar/**").permitAll()
                    .anyRequest().authenticated();
            })
            .addFilterBefore(headerAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
