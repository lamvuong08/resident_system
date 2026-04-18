package com.dancu.qlydancu;

import com.dancu.qlydancu.model.User;
import com.dancu.qlydancu.model.enums.UserRole;
import com.dancu.qlydancu.model.enums.UserStatus;
import com.dancu.qlydancu.repo.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class QlydancuApplication {

	public static void main(String[] args) {
		SpringApplication.run(QlydancuApplication.class, args);
	}

	@Bean
	public CommandLineRunner seedAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		return args -> {
			String adminEmail = "admin@admin.local";
			if (userRepository.findByEmail(adminEmail).isEmpty()) {
				User admin = new User();
				admin.setName("Administrator");
				admin.setEmail(adminEmail);
				admin.setPassword(passwordEncoder.encode("admin123"));
				admin.setRoles(UserRole.ROLE_ADMIN);
				admin.setStatus(UserStatus.ACTIVE);
				userRepository.save(admin);
				System.out.println("Seeded admin user: admin@admin.local / admin123");
			}
		};
	}

}
