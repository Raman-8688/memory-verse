package com.memoryverse.config;

import com.memoryverse.modules.journey.Journey;
import com.memoryverse.modules.journey.JourneyRepository;
import com.memoryverse.modules.journey.JourneySection;
import com.memoryverse.modules.user.Role;
import com.memoryverse.modules.user.User;
import com.memoryverse.modules.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final JourneyRepository journeyRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already contains users. Skipping initial data seeding.");
            return;
        }

        log.info("Starting initial seed data population for MemoryVerse...");

        // 1. Seed Admin User
        User admin = User.builder()
                .email("admin@memoryverse.com")
                .password(passwordEncoder.encode("password123"))
                .fullName("Arjun Verma")
                .avatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80")
                .role(Role.ADMIN)
                .build();
        admin = userRepository.save(admin);
        log.info("Seeded ADMIN user: admin@memoryverse.com / password123");

        // 2. Seed Member User
        User member = User.builder()
                .email("ravi@memoryverse.com")
                .password(passwordEncoder.encode("password123"))
                .fullName("Ravi Teja")
                .avatarUrl("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80")
                .role(Role.MEMBER)
                .build();
        member = userRepository.save(member);
        log.info("Seeded MEMBER user: ravi@memoryverse.com / password123");

        // 3. Seed College Journey
        Journey btechJourney = Journey.builder()
                .title("B.Tech College Days")
                .slug("btech-college-days")
                .description("Four unforgettable years of friendships, late night canteen talks, lab viva panics, and building memories that will last a lifetime.")
                .coverImageUrl("https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80")
                .startDate(LocalDate.of(2018, 8, 1))
                .endDate(LocalDate.of(2022, 6, 30))
                .displayOrder(1)
                .isActive(true)
                .createdBy(admin)
                .build();

        btechJourney.addSection(JourneySection.builder()
                .title("First Year & Hostel Beginnings")
                .description("The nervous excitement of stepping into college, freshers welcome, and midnight chai runs.")
                .displayOrder(1)
                .startDate(LocalDate.of(2018, 8, 1))
                .endDate(LocalDate.of(2019, 5, 31))
                .build());

        btechJourney.addSection(JourneySection.builder()
                .title("Campus Fests & Hackathons")
                .description("All-nighter coding sprints, cultural fest prep, and taking over the college auditorium.")
                .displayOrder(2)
                .startDate(LocalDate.of(2019, 8, 1))
                .endDate(LocalDate.of(2020, 3, 15))
                .build());

        btechJourney.addSection(JourneySection.builder()
                .title("Graduation & The Goa Trip")
                .description("The legendary final trip, emotional goodbyes, throwing caps in the air, and promising to stay connected forever.")
                .displayOrder(3)
                .startDate(LocalDate.of(2022, 1, 1))
                .endDate(LocalDate.of(2022, 6, 30))
                .build());

        journeyRepository.save(btechJourney);

        // 4. Seed Reunion / Trips Journey
        Journey tripsJourney = Journey.builder()
                .title("Road Trips & Reunions")
                .slug("road-trips-and-reunions")
                .description("Catching up across different cities after graduation. Exploring the western ghats, camping, and reliving the good old days.")
                .coverImageUrl("https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&w=1200&q=80")
                .startDate(LocalDate.of(2022, 10, 1))
                .endDate(LocalDate.of(2024, 12, 31))
                .displayOrder(2)
                .isActive(true)
                .createdBy(member)
                .build();

        tripsJourney.addSection(JourneySection.builder()
                .title("Coorg Monsoon Escape")
                .description("Coffee plantations, mist-covered hills, and non-stop reminiscing.")
                .displayOrder(1)
                .startDate(LocalDate.of(2023, 7, 14))
                .endDate(LocalDate.of(2023, 7, 17))
                .build());

        journeyRepository.save(tripsJourney);
        log.info("Seeded initial journeys and chapters.");
    }
}
