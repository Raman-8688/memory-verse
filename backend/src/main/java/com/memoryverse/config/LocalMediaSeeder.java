package com.memoryverse.config;

import com.memoryverse.dto.response.UploadedMediaResult;
import com.memoryverse.entity.Journey;
import com.memoryverse.entity.JourneySection;
import com.memoryverse.entity.Media;
import com.memoryverse.entity.Memory;
import com.memoryverse.entity.User;
import com.memoryverse.integration.storage.CloudinaryStorageService;
import com.memoryverse.repository.JourneyRepository;
import com.memoryverse.repository.JourneySectionRepository;
import com.memoryverse.repository.MemoryRepository;
import com.memoryverse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class LocalMediaSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final JourneyRepository journeyRepository;
    private final JourneySectionRepository journeySectionRepository;
    private final MemoryRepository memoryRepository;
    private final CloudinaryStorageService cloudinaryStorageService;

    @Value("${app.seed-local-media:false}")
    private boolean seedLocalMedia;

    private static final String RAW_DATA_PATH = "raw_data";
    private static final long MAX_VIDEO_BYTES = 50L * 1024 * 1024; // 50MB

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedLocalMedia) {
            log.info("Local media seeding disabled via app.seed-local-media=false");
            return;
        }

        Path rawDataDir = Paths.get(RAW_DATA_PATH);
        if (!Files.exists(rawDataDir) || !Files.isDirectory(rawDataDir)) {
            // Check parent or current directory
            rawDataDir = Paths.get("../raw_data");
            if (!Files.exists(rawDataDir)) {
                log.info("raw_data directory not found. Skipping local media seeding.");
                return;
            }
        }

        // Avoid re-seeding if already populated with local memories
        long memoryCount = memoryRepository.count();
        if (memoryCount >= 8) {
            log.info("Local media already seeded (memory count: {}). Skipping.", memoryCount);
            return;
        }

        log.info("Starting automated local data seeding from '{}'...", rawDataDir.toAbsolutePath());

        try {
            // Find Admin and Member users
            Optional<User> adminOpt = userRepository.findByEmail("admin@memoryverse.com");
            Optional<User> memberOpt = userRepository.findByEmail("ravi@memoryverse.com");
            if (adminOpt.isEmpty()) {
                log.warn("Admin user not found. Skipping local media seed.");
                return;
            }
            User admin = adminOpt.get();
            User member = memberOpt.orElse(admin);

            // Find or create B.Tech Journey
            Journey btechJourney = journeyRepository.findBySlug("btech-college-days")
                    .orElseGet(() -> {
                        List<Journey> all = journeyRepository.findAll();
                        return all.isEmpty() ? null : all.get(0);
                    });

            if (btechJourney == null) {
                log.warn("No journey found to attach local media. Skipping.");
                return;
            }

            // Ensure Sections exist for Year 1, Year 2, Year 3
            Map<String, JourneySection> sectionMap = ensureSections(btechJourney);

            // Collect files by year folder
            Map<String, List<File>> yearFiles = scanMediaFiles(rawDataDir);

            // Seed First Year memories (2020-2021)
            seedYearMemories(yearFiles.get("first_year"), sectionMap.get("first_year"), btechJourney, admin, member,
                    "First Year — Campus Fresher's & Late Night Canteen",
                    LocalDate.of(2021, 3, 10));

            // Seed Second Year memories (2021-2022)
            seedYearMemories(yearFiles.get("second_year"), sectionMap.get("second_year"), btechJourney, member, admin,
                    "Second Year — Coding Sprints & Hostel Shenanigans",
                    LocalDate.of(2022, 1, 15));

            // Seed Third Year memories (2022-2023)
            seedYearMemories(yearFiles.get("third_year"), sectionMap.get("third_year"), btechJourney, admin, member,
                    "Third Year — Tech Fests, Road Trips & Celebrations",
                    LocalDate.of(2023, 3, 5));

            log.info("Local media seeding completed successfully! Total memories in DB: {}", memoryRepository.count());

        } catch (Exception ex) {
            log.error("Error during local media seeding (safe recovery): {}", ex.getMessage(), ex);
        }
    }

    private Map<String, JourneySection> ensureSections(Journey journey) {
        Map<String, JourneySection> map = new HashMap<>();

        for (JourneySection sec : journey.getSections()) {
            String title = sec.getTitle().toLowerCase();
            if (title.contains("first") || title.contains("hostel") || title.contains("1st")) {
                map.put("first_year", sec);
            } else if (title.contains("second") || title.contains("2nd") || title.contains("fest")) {
                map.put("second_year", sec);
            } else if (title.contains("third") || title.contains("3rd") || title.contains("trip") || title.contains("grad")) {
                map.put("third_year", sec);
            }
        }

        // Create missing sections if needed
        if (!map.containsKey("second_year")) {
            JourneySection sec2 = JourneySection.builder()
                    .title("Second Year — Campus Life & Coding")
                    .description("The core college grind, practical labs, and non-stop conversations.")
                    .displayOrder(2)
                    .startDate(LocalDate.of(2021, 8, 1))
                    .endDate(LocalDate.of(2022, 5, 31))
                    .journey(journey)
                    .build();
            sec2 = journeySectionRepository.save(sec2);
            map.put("second_year", sec2);
        }

        if (!map.containsKey("third_year")) {
            JourneySection sec3 = JourneySection.builder()
                    .title("Third Year — Hackathons & Road Trips")
                    .description("Breaking out of the campus bubble, inter-college events, and weekend getaways.")
                    .displayOrder(3)
                    .startDate(LocalDate.of(2022, 8, 1))
                    .endDate(LocalDate.of(2023, 5, 31))
                    .journey(journey)
                    .build();
            sec3 = journeySectionRepository.save(sec3);
            map.put("third_year", sec3);
        }

        return map;
    }

    private Map<String, List<File>> scanMediaFiles(Path root) {
        Map<String, List<File>> map = new HashMap<>();
        map.put("first_year", new ArrayList<>());
        map.put("second_year", new ArrayList<>());
        map.put("third_year", new ArrayList<>());

        try {
            Files.walk(root)
                    .filter(Files::isRegularFile)
                    .forEach(path -> {
                        String name = path.getFileName().toString().toLowerCase();
                        if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".mp4")) {
                            File file = path.toFile();
                            String pathStr = path.toString().toLowerCase();

                            // Filter out files exceeding 50MB
                            if (file.length() > MAX_VIDEO_BYTES) {
                                log.warn("Skipping file exceeding 50MB limit: {} ({} MB)", file.getName(), file.length() / (1024 * 1024));
                                return;
                            }

                            if (pathStr.contains("first") || pathStr.contains("frist")) {
                                map.get("first_year").add(file);
                            } else if (pathStr.contains("second")) {
                                map.get("second_year").add(file);
                            } else if (pathStr.contains("third") || pathStr.contains("thred")) {
                                map.get("third_year").add(file);
                            }
                        }
                    });
        } catch (IOException e) {
            log.error("Error scanning raw_data folder: {}", e.getMessage());
        }

        return map;
    }

    private void seedYearMemories(List<File> files, JourneySection section, Journey journey,
                                  User creator, User taggedFriend, String titlePrefix, LocalDate baseDate) {
        if (files == null || files.isEmpty()) return;

        // Chunk files into groups of 3-5 assets per memory
        int batchSize = 4;
        for (int i = 0; i < files.size(); i += batchSize) {
            List<File> batch = files.subList(i, Math.min(i + batchSize, files.size()));
            int memoryIndex = (i / batchSize) + 1;

            LocalDate memoryDate = baseDate.plusDays(memoryIndex * 12L);
            String title = String.format("%s (Part %d)", titlePrefix, memoryIndex);
            String story = "A collection of snapshots and moments captured during our college days. Every frame tells a story of laughs, chaos, and unforgettable friendship.";

            Memory memory = Memory.builder()
                    .title(title)
                    .story(story)
                    .memoryDate(memoryDate)
                    .locationName("Campus & City")
                    .isFeatured(memoryIndex == 1)
                    .journey(journey)
                    .section(section)
                    .createdBy(creator)
                    .build();

            memory.tagUser(taggedFriend);

            int displayOrder = 1;
            for (File file : batch) {
                try {
                    CustomFileMultipartFile multipartFile = new CustomFileMultipartFile(file);
                    UploadedMediaResult uploaded = cloudinaryStorageService.uploadFile(multipartFile);

                    Media media = Media.builder()
                            .mediaUrl(uploaded.getMediaUrl())
                            .thumbnailUrl(uploaded.getThumbnailUrl())
                            .mediaType(uploaded.getMediaType())
                            .publicId(uploaded.getPublicId())
                            .fileName(uploaded.getFileName())
                            .fileSizeBytes(uploaded.getFileSizeBytes())
                            .width(uploaded.getWidth())
                            .height(uploaded.getHeight())
                            .durationSeconds(uploaded.getDurationSeconds())
                            .displayOrder(displayOrder++)
                            .build();

                    memory.addMedia(media);
                } catch (Exception e) {
                    log.warn("Could not upload file {}: {}", file.getName(), e.getMessage());
                }
            }

            if (!memory.getMediaList().isEmpty()) {
                memoryRepository.save(memory);
                log.info("Seeded memory: '{}' with {} media items", title, memory.getMediaList().size());
            }
        }
    }

    /**
     * Minimal standalone MultipartFile adapter to stream local File without extra test dependencies.
     */
    private static class CustomFileMultipartFile implements MultipartFile {
        private final File file;
        private final String name;

        public CustomFileMultipartFile(File file) {
            this.file = file;
            this.name = file.getName();
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public String getOriginalFilename() {
            return name;
        }

        @Override
        public String getContentType() {
            String lower = name.toLowerCase();
            if (lower.endsWith(".mp4")) return "video/mp4";
            if (lower.endsWith(".png")) return "image/png";
            return "image/jpeg";
        }

        @Override
        public boolean isEmpty() {
            return file.length() == 0;
        }

        @Override
        public long getSize() {
            return file.length();
        }

        @Override
        public byte[] getBytes() throws IOException {
            return Files.readAllBytes(file.toPath());
        }

        @Override
        public InputStream getInputStream() throws IOException {
            return new FileInputStream(file);
        }

        @Override
        public void transferTo(File dest) throws IOException, IllegalStateException {
            Files.copy(file.toPath(), dest.toPath());
        }
    }
}
