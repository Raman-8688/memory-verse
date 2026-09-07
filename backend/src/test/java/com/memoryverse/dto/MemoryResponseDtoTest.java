package com.memoryverse.dto;

import com.memoryverse.dto.response.MemoryResponseDto;
import com.memoryverse.entity.Media;
import com.memoryverse.entity.MediaType;
import com.memoryverse.entity.Memory;
import com.memoryverse.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class MemoryResponseDtoTest {

    @Test
    @DisplayName("Should prevent duplicate media in DTO even when entity collection contains Cartesian product duplicates")
    void shouldDeduplicateMediaListWhenCartesianProductOccurs() {
        UUID memoryId = UUID.randomUUID();
        UUID mediaId = UUID.randomUUID();

        User creator = User.builder()
                .id(UUID.randomUUID())
                .fullName("Raman")
                .email("raman@memoryverse.local")
                .build();

        Media singleMedia = Media.builder()
                .id(mediaId)
                .mediaUrl("https://res.cloudinary.com/demo/image/upload/sample.jpg")
                .thumbnailUrl("https://res.cloudinary.com/demo/image/upload/c_thumb,w_200/sample.jpg")
                .mediaType(MediaType.IMAGE)
                .fileName("sample.jpg")
                .displayOrder(1)
                .build();

        // Simulate Hibernate Cartesian product duplication (1 media repeated 8 times for 8 tagged users)
        List<Media> simulatedBagDuplicates = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            simulatedBagDuplicates.add(singleMedia);
        }

        Set<User> eightTaggedUsers = new HashSet<>();
        for (int i = 0; i < 8; i++) {
            eightTaggedUsers.add(User.builder()
                    .id(UUID.randomUUID())
                    .fullName("Friend " + i)
                    .email("friend" + i + "@memoryverse.local")
                    .build());
        }

        Memory memory = Memory.builder()
                .id(memoryId)
                .title("Testing Moment")
                .story("A memorable day with friends.")
                .memoryDate(LocalDate.now())
                .createdBy(creator)
                .mediaList(simulatedBagDuplicates)
                .taggedUsers(eightTaggedUsers)
                .build();

        // When converting to DTO
        MemoryResponseDto dto = MemoryResponseDto.fromEntity(memory);

        // Then mediaList must have EXACTLY 1 item, not 8!
        assertNotNull(dto);
        assertEquals(1, dto.getMediaList().size(), "Expected exactly 1 media item in DTO, but found " + dto.getMediaList().size());
        assertEquals(mediaId, dto.getMediaList().get(0).getId());
        assertEquals(8, dto.getTaggedUsers().size(), "Expected all 8 tagged users to be preserved");
    }

    @Test
    @DisplayName("Should handle multiple distinct media files without dropping valid items")
    void shouldPreserveMultipleDistinctMediaItems() {
        UUID memoryId = UUID.randomUUID();
        User creator = User.builder().id(UUID.randomUUID()).fullName("Raman").email("raman@test.com").build();

        Media photo1 = Media.builder().id(UUID.randomUUID()).mediaUrl("url1").displayOrder(1).build();
        Media photo2 = Media.builder().id(UUID.randomUUID()).mediaUrl("url2").displayOrder(2).build();
        Media photo3 = Media.builder().id(UUID.randomUUID()).mediaUrl("url3").displayOrder(3).build();

        // Simulate 8 tagged users causing each photo to appear 8 times (24 rows in Bag)
        List<Media> bagWithMultipleDuplicates = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            bagWithMultipleDuplicates.add(photo1);
            bagWithMultipleDuplicates.add(photo2);
            bagWithMultipleDuplicates.add(photo3);
        }

        Memory memory = Memory.builder()
                .id(memoryId)
                .title("Multi-photo Trip")
                .story("Story text")
                .memoryDate(LocalDate.now())
                .createdBy(creator)
                .mediaList(bagWithMultipleDuplicates)
                .build();

        MemoryResponseDto dto = MemoryResponseDto.fromEntity(memory);

        assertNotNull(dto);
        assertEquals(3, dto.getMediaList().size(), "Expected exactly 3 unique media items, but found " + dto.getMediaList().size());
        assertEquals(photo1.getId(), dto.getMediaList().get(0).getId());
        assertEquals(photo2.getId(), dto.getMediaList().get(1).getId());
        assertEquals(photo3.getId(), dto.getMediaList().get(2).getId());
    }

    @Test
    @DisplayName("Media entity equals and hashCode must be consistent based on ID")
    void testMediaEqualsAndHashCode() {
        UUID id1 = UUID.randomUUID();
        Media m1 = Media.builder().id(id1).mediaUrl("url1").build();
        Media m2 = Media.builder().id(id1).mediaUrl("url1").build();
        Media m3 = Media.builder().id(UUID.randomUUID()).mediaUrl("url2").build();

        assertEquals(m1, m2, "Media instances with same ID must be equal");
        assertEquals(m1.hashCode(), m2.hashCode(), "Media instances with same ID must have same hashCode");
        assertNotEquals(m1, m3, "Media instances with different ID must not be equal");
    }

    @Test
    @DisplayName("Memory addMedia must reject duplicate media references")
    void testMemoryAddMediaDeduplication() {
        Memory memory = Memory.builder()
                .id(UUID.randomUUID())
                .title("Test Memory")
                .story("Story")
                .memoryDate(LocalDate.now())
                .build();

        UUID mediaId = UUID.randomUUID();
        Media m1 = Media.builder().id(mediaId).mediaUrl("photo.jpg").build();
        Media m2 = Media.builder().id(mediaId).mediaUrl("photo.jpg").build();

        memory.addMedia(m1);
        memory.addMedia(m2); // Duplicate add

        assertEquals(1, memory.getMediaList().size(), "Memory mediaList must not contain duplicate media");
    }
}
