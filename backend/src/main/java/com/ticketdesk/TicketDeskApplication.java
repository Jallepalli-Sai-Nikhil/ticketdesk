package com.ticketdesk;

import com.ticketdesk.model.User;
import com.ticketdesk.model.UserRole;
import com.ticketdesk.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class TicketDeskApplication {
    public static void main(String[] args) {
        SpringApplication.run(TicketDeskApplication.class, args);
    }

    @Bean
    public CommandLineRunner initData(UserRepository userRepository) {
        return args -> {
            if (userRepository.count() == 0) {
                userRepository.save(User.builder()
                        .username("admin")
                        .password("admin123")
                        .role(UserRole.ADMIN)
                        .build());
                userRepository.save(User.builder()
                        .username("employee")
                        .password("employee123")
                        .role(UserRole.EMPLOYEE)
                        .build());
            }
        };
    }
}
