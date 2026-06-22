package com.tapacademy.learningplatform.config;

import com.tapacademy.learningplatform.security.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
            .authorizeHttpRequests(auth -> auth
                // Public authentication endpoints & H2 Console
                .requestMatchers("/api/auth/login", "/api/auth/signup", "/api/auth/logout").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                
                // Public course viewing
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/courses/**").permitAll()
                
                // Admin course management (create, update, delete)
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/courses/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/courses/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/courses/**").hasAuthority("ROLE_ADMIN")
                
                // Student enrollment and progress actions
                .requestMatchers("/api/students/my-enrollments").hasAuthority("ROLE_STUDENT")
                .requestMatchers("/api/students/enroll/**").hasAuthority("ROLE_STUDENT")
                .requestMatchers("/api/students/progress").hasAuthority("ROLE_STUDENT")
                
                // Notifications authorization
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/notifications", "/api/notifications/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/notifications", "/api/notifications/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/notifications", "/api/notifications/**").hasAnyAuthority("ROLE_STUDENT", "ROLE_ADMIN")
                
                // Quiz / Test system
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/quizzes/my").hasAuthority("ROLE_STUDENT")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/quizzes/*/questions").hasAuthority("ROLE_STUDENT")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/quizzes/*/submit").hasAuthority("ROLE_STUDENT")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/quizzes").hasAuthority("ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/quizzes/*").hasAuthority("ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/quizzes").hasAuthority("ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/quizzes/*/questions").hasAuthority("ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/quizzes/*/make-live").hasAuthority("ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/quizzes/*/complete").hasAuthority("ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/quizzes/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/quizzes/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/quizzes/*/submissions").hasAuthority("ROLE_ADMIN")
                
                // Auth profile endpoint
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/auth/me").hasAnyAuthority("ROLE_STUDENT", "ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/auth/update-profile").hasAnyAuthority("ROLE_STUDENT", "ROLE_ADMIN")
                
                // Admin student management and overall analytics
                .requestMatchers("/api/students/**").hasAuthority("ROLE_ADMIN")
                
                // Static HTML pages and frontend assets
                .requestMatchers(
                    "/", "/index.html", "/login.html", "/courses.html",
                    "/students.html", "/student.html", "/settings.html",
                    "/analytics.html", "/app.js", "/styles.css",
                    "/student-profile.html", "/student-settings.html",
                    "/student-tests.html", "/test-session.html", "/admin-tests.html",
                    "/favicon.ico", "/assets/**", "/images/**"
                ).permitAll()
                
                .anyRequest().authenticated()
            )
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable());

        http.authenticationProvider(authenticationProvider());
        return http.build();
    }

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();
        configuration.setAllowedOriginPatterns(java.util.List.of(
            "http://localhost:5500", "http://127.0.0.1:5500", 
            "http://localhost:3000", "http://localhost:8080",
            "http://localhost:*", "http://127.0.0.1:*"
        ));
        configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(java.util.List.of("Authorization", "Cache-Control", "Content-Type", "Accept"));
        configuration.setAllowCredentials(true);
        
        org.springframework.web.cors.UrlBasedCorsConfigurationSource source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
