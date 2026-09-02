package com.memoryverse.config;

import com.memoryverse.entity.Journey;
import com.memoryverse.entity.JourneySection;
import com.memoryverse.entity.Notification;
import com.memoryverse.entity.NotificationType;
import com.memoryverse.entity.Role;
import com.memoryverse.entity.User;
import com.memoryverse.repository.JourneyRepository;
import com.memoryverse.repository.NotificationRepository;
import com.memoryverse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final JourneyRepository journeyRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationRepository notificationRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking and seeding group members in DataInitializer...");

        try {
            jdbcTemplate.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;");
            log.info("Successfully dropped legacy notifications_type_check constraint");
        } catch (Exception ex) {
            log.warn("Could not drop notifications_type_check constraint: {}", ex.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE memories ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE NOT NULL;");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_memories_is_favorite ON memories(is_favorite);");
            log.info("Ensured is_favorite column and index exist on memories table");
        } catch (Exception ex) {
            log.warn("Could not ensure is_favorite column on memories table: {}", ex.getMessage());
        }

        String defaultPass = passwordEncoder.encode("password123");

        // 1. Migrate old dummy "ravi@memoryverse.com" to "ramesh@memoryverse.com" if needed
        Optional<User> raviOpt = userRepository.findByEmail("ravi@memoryverse.com");
        Optional<User> rameshOpt = userRepository.findByEmail("ramesh@memoryverse.com");

        if (raviOpt.isPresent() && rameshOpt.isEmpty()) {
            User ravi = raviOpt.get();
            ravi.setEmail("ramesh@memoryverse.com");
            ravi.setFullName("Ramesh");
            ravi.setRole(Role.ADMIN);
            ravi.setAvatarUrl("/api/media/raw/users_details/ramesh.jpg");
            ravi.setPassword(defaultPass);
            userRepository.save(ravi);
            log.info("Migrated existing user ravi@memoryverse.com -> ramesh@memoryverse.com (Admin 2)");
        } else if (raviOpt.isPresent() && rameshOpt.isPresent()) {
            User ravi = raviOpt.get();
            ravi.setEmail("ravi_archive@memoryverse.com");
            userRepository.save(ravi);
        }

        // 2. Seed or Update Admin 1: Raman (admin@memoryverse.com)
        User raman = seedOrUpdateUser("admin@memoryverse.com", "Raman", Role.ADMIN,
                "/api/media/raw/users_details/raman.jpg", defaultPass);

        // 3. Seed or Update Admin 2: Ramesh (ramesh@memoryverse.com)
        User ramesh = seedOrUpdateUser("ramesh@memoryverse.com", "Ramesh", Role.ADMIN,
                "/api/media/raw/users_details/ramesh.jpg", defaultPass);

        // 4. Seed or Update Standard Members
        seedOrUpdateUser("govardhan@memoryverse.com", "Govardhan", Role.MEMBER,
                "/api/media/raw/users_details/govardhan.jpg", defaultPass);

        seedOrUpdateUser("shayam@memoryverse.com", "Shayam", Role.MEMBER,
                "/api/media/raw/users_details/shayam.jpg", defaultPass);

        seedOrUpdateUser("narasimha@memoryverse.com", "Narasimha", Role.MEMBER,
                "/api/media/raw/users_details/narasimha.jpg", defaultPass);

        seedOrUpdateUser("raju@memoryverse.com", "Raju", Role.MEMBER,
                "/api/media/raw/users_details/raju.jpg", defaultPass);

        seedOrUpdateUser("yugandar@memoryverse.com", "Yugandar", Role.MEMBER,
                "/api/media/raw/users_details/yugandar.jpg", defaultPass);

        seedOrUpdateUser("hemanth@memoryverse.com", "Hemanth", Role.MEMBER,
                "/api/media/raw/users_details/hemanth.jpg", defaultPass);

        // 5. If Journeys do not exist, seed initial B.Tech Journey
        if (journeyRepository.count() == 0) {
            log.info("Seeding initial B.Tech College Days Journey...");
            Journey btechJourney = Journey.builder()
                    .title("B.Tech College Days")
                    .slug("btech-college-days")
                    .description("Four unforgettable years of friendships, late night coding, mess food debates, exam panics, and countless memories.")
                    .coverImageUrl("/api/media/raw/images/btech-2024/third_year/IMG20220620104600.jpg")
                    .startDate(LocalDate.of(2020, 8, 1))
                    .endDate(LocalDate.of(2024, 5, 31))
                    .displayOrder(1)
                    .isActive(true)
                    .createdBy(raman)
                    .build();

            JourneySection sec1 = JourneySection.builder()
                    .title("First Year — Beginnings & Hostel Life")
                    .description("Fresh faces, campus orientations, late-night hostel hangouts, and surviving early 8 AM lectures.")
                    .displayOrder(1)
                    .startDate(LocalDate.of(2020, 8, 1))
                    .endDate(LocalDate.of(2021, 5, 31))
                    .imageUrl("/api/media/raw/images/btech-2024/first_year/Screenshot_20210301_165025.jpg")
                    .build();

            JourneySection sec2 = JourneySection.builder()
                    .title("Second Year — Campus Life & Coding")
                    .description("The core engineering grind, practical labs, canteen conversations, and hackathon all-nighters.")
                    .displayOrder(2)
                    .startDate(LocalDate.of(2021, 8, 1))
                    .endDate(LocalDate.of(2022, 5, 31))
                    .imageUrl("/api/media/raw/images/btech-2024/second_year/IMG-20211231-WA0003.jpg")
                    .build();

            JourneySection sec3 = JourneySection.builder()
                    .title("Third Year — Tech Fests & Road Trips")
                    .description("Annual college fests, cultural nights, sunset chai sessions, and unforgettable road trips with the gang.")
                    .displayOrder(3)
                    .startDate(LocalDate.of(2022, 8, 1))
                    .endDate(LocalDate.of(2023, 5, 31))
                    .imageUrl("/api/media/raw/images/btech-2024/third_year/IMG20220620104600.jpg")
                    .build();

            JourneySection sec4 = JourneySection.builder()
                    .title("Final Year — Capstone & Farewell")
                    .description("Major project submissions, placement celebrations, campus goodbyes, and the grand farewell party.")
                    .displayOrder(4)
                    .startDate(LocalDate.of(2023, 8, 1))
                    .endDate(LocalDate.of(2024, 5, 31))
                    .imageUrl("/api/media/raw/images/btech-2024/final_year/IMG_20240523_155906.jpg")
                    .build();

            btechJourney.addSection(sec1);
            btechJourney.addSection(sec2);
            btechJourney.addSection(sec3);
            btechJourney.addSection(sec4);

            journeyRepository.save(btechJourney);
            log.info("Seeded B.Tech journey with 4 chapters.");
        } else {
            // Update section images for existing sections if missing
            journeyRepository.findAll().forEach(j -> {
                boolean updated = false;
                for (JourneySection sec : j.getSections()) {
                    if (sec.getImageUrl() == null || sec.getImageUrl().isBlank()) {
                        if (sec.getTitle().contains("First Year")) {
                            sec.setImageUrl("/api/media/raw/images/btech-2024/first_year/Screenshot_20210301_165025.jpg");
                            updated = true;
                        } else if (sec.getTitle().contains("Second Year")) {
                            sec.setImageUrl("/api/media/raw/images/btech-2024/second_year/IMG-20211231-WA0003.jpg");
                            updated = true;
                        } else if (sec.getTitle().contains("Third Year")) {
                            sec.setImageUrl("/api/media/raw/images/btech-2024/third_year/IMG20220620104600.jpg");
                            updated = true;
                        } else if (sec.getTitle().contains("Final Year")) {
                            sec.setImageUrl("/api/media/raw/images/btech-2024/final_year/IMG_20240523_155906.jpg");
                            updated = true;
                        }
                    }
                }
                if (updated) {
                    journeyRepository.save(j);
                    log.info("Populated chapter cover images for journey: {}", j.getTitle());
                }
            });
        }

        // Seed initial notifications if empty so Activity Center is lively
        if (notificationRepository.count() == 0) {
            userRepository.findByEmail("admin@memoryverse.com").ifPresent(adminUser -> {
                notificationRepository.save(Notification.builder()
                        .recipient(adminUser)
                        .message("Welcome to MemoryVerse, Raman! Your group's shared archive is ready.")
                        .type(NotificationType.SYSTEM)
                        .isRead(false)
                        .build());
                notificationRepository.save(Notification.builder()
                        .recipient(adminUser)
                        .message("Ramesh preserved a new memory: 'Late Night Canteen Talks'")
                        .type(NotificationType.MEMORY_CREATED)
                        .isRead(false)
                        .build());
                notificationRepository.save(Notification.builder()
                        .recipient(adminUser)
                        .message("Govardhan tagged you in: 'B.Tech Freshers Welcome'")
                        .type(NotificationType.TAGGED)
                        .isRead(false)
                        .build());
                notificationRepository.save(Notification.builder()
                        .recipient(adminUser)
                        .message("Shyam added 4 new photos to 'Goa Road Trip & Sunset'")
                        .type(NotificationType.MEDIA_ADDED)
                        .isRead(false)
                        .build());
            });
            log.info("Seeded initial notifications for testing.");
        }

        log.info("Group members initialization successfully completed.");
    }

    private User seedOrUpdateUser(String email, String fullName, Role role, String avatarUrl, String encodedPassword) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User user = existing.get();
            user.setFullName(fullName);
            user.setRole(role);
            user.setAvatarUrl(avatarUrl);
            user.setPassword(encodedPassword);
            User updated = userRepository.save(user);
            log.info("Updated existing member: {} ({}) [{}] with avatar {}", fullName, email, role, avatarUrl);
            return updated;
        } else {
            User newUser = User.builder()
                    .email(email)
                    .fullName(fullName)
                    .password(encodedPassword)
                    .role(role)
                    .avatarUrl(avatarUrl)
                    .build();
            User saved = userRepository.save(newUser);
            log.info("Seeded new member: {} ({}) [{}] with avatar {}", fullName, email, role, avatarUrl);
            return saved;
        }
    }
}
