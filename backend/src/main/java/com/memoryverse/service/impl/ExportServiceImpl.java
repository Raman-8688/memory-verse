package com.memoryverse.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.memoryverse.dto.response.JourneyResponseDto;
import com.memoryverse.dto.response.MemoryResponseDto;
import com.memoryverse.entity.Media;
import com.memoryverse.entity.Memory;
import com.memoryverse.exception.ResourceNotFoundException;
import com.memoryverse.repository.MemoryRepository;
import com.memoryverse.service.ExportService;
import com.memoryverse.service.JourneyService;
import com.memoryverse.service.MemoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExportServiceImpl implements ExportService {

    private final MemoryService memoryService;
    private final JourneyService journeyService;
    private final MemoryRepository memoryRepository;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .enable(SerializationFeature.INDENT_OUTPUT);

    @Override
    @Transactional(readOnly = true)
    public byte[] exportMemoryZip(UUID memoryId) {
        MemoryResponseDto memoryDto = memoryService.getMemoryById(memoryId);
        Memory memory = memoryRepository.findById(memoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Memory not found"));

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {

            String jsonContent = OBJECT_MAPPER.writeValueAsString(memoryDto);
            addZipEntry(zos, "story.json", jsonContent.getBytes(StandardCharsets.UTF_8));

            String markdownContent = generateMemoryMarkdown(memoryDto);
            addZipEntry(zos, "story.md", markdownContent.getBytes(StandardCharsets.UTF_8));

            String htmlBook = generateMemoryKeepsakeHtml(memoryId);
            addZipEntry(zos, "keepsake-book.html", htmlBook.getBytes(StandardCharsets.UTF_8));

            StringBuilder manifest = new StringBuilder("# Media Assets Manifest\n\n");
            if (memory.getMediaList() != null && !memory.getMediaList().isEmpty()) {
                for (Media m : memory.getMediaList()) {
                    manifest.append("- [").append(m.getMediaType()).append("] ")
                            .append(m.getFileName() != null ? m.getFileName() : "media")
                            .append(" : ").append(m.getMediaUrl()).append("\n");
                }
            } else {
                manifest.append("No attached media.\n");
            }
            addZipEntry(zos, "media-manifest.txt", manifest.toString().getBytes(StandardCharsets.UTF_8));

            zos.finish();
            return baos.toByteArray();
        } catch (IOException e) {
            log.error("Failed to package memory ZIP archive: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate keepsake archive", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportJourneyZip(UUID journeyId) {
        JourneyResponseDto journeyDto = journeyService.getJourneyById(journeyId);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {

            String jsonContent = OBJECT_MAPPER.writeValueAsString(journeyDto);
            addZipEntry(zos, "journey-metadata.json", jsonContent.getBytes(StandardCharsets.UTF_8));

            String htmlBook = generateJourneyKeepsakeHtml(journeyId);
            addZipEntry(zos, "journey-keepsake-book.html", htmlBook.getBytes(StandardCharsets.UTF_8));

            zos.finish();
            return baos.toByteArray();
        } catch (IOException e) {
            log.error("Failed to package journey ZIP archive: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate journey keepsake archive", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public String generateMemoryKeepsakeHtml(UUID memoryId) {
        MemoryResponseDto m = memoryService.getMemoryById(memoryId);
        String formattedDate = m.getMemoryDate() != null ? m.getMemoryDate().format(DateTimeFormatter.ofPattern("MMMM d, yyyy")) : "Timeless";

        StringBuilder mediaHtml = new StringBuilder();
        if (m.getMediaList() != null) {
            for (var media : m.getMediaList()) {
                if ("IMAGE".equalsIgnoreCase(media.getMediaType().name())) {
                    mediaHtml.append("<div class='keepsake-photo-card'>")
                            .append("<img src='").append(media.getMediaUrl()).append("' alt='Memory photo' />")
                            .append("</div>");
                }
            }
        }

        StringBuilder companionsHtml = new StringBuilder();
        if (m.getTaggedUsers() != null && !m.getTaggedUsers().isEmpty()) {
            for (var user : m.getTaggedUsers()) {
                companionsHtml.append("<span class='companion-pill'>").append(user.getFullName()).append("</span>");
            }
        }

        String safeTitle = escapeHtml(m.getTitle());
        String safeJourney = m.getJourneyTitle() != null ? escapeHtml(m.getJourneyTitle().toUpperCase()) : "COLLECTIVE STORY";
        String safeLocation = m.getLocationName() != null ? escapeHtml(m.getLocationName()) : "Archive Location";
        String safeCreator = m.getCreatedBy() != null ? escapeHtml(m.getCreatedBy().getFullName()) : "Companion";
        String safeStory = escapeHtml(m.getStory() != null ? m.getStory() : "");

        return "<!DOCTYPE html>\n" +
                "<html lang=\"en\">\n" +
                "<head>\n" +
                "  <meta charset=\"UTF-8\">\n" +
                "  <title>" + safeTitle + " — MemoryVerse Keepsake</title>\n" +
                "  <style>\n" +
                "    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');\n" +
                "    @page { size: A4 portrait; margin: 20mm; }\n" +
                "    * { box-sizing: border-box; }\n" +
                "    body { font-family: 'Plus Jakarta Sans', sans-serif; color: #1c1917; background: #faf8f5; margin: 0; padding: 40px 20px; line-height: 1.7; }\n" +
                "    .keepsake-container { max-width: 800px; margin: 0 auto; background: #fff; padding: 60px 50px; border: 1px solid #e7e5e4; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }\n" +
                "    .header-kicker { font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; color: #b45309; margin-bottom: 8px; }\n" +
                "    .keepsake-title { font-family: 'Playfair Display', Georgia, serif; font-size: 2.5rem; font-weight: 700; color: #1c1917; line-height: 1.2; margin: 0 0 16px 0; }\n" +
                "    .meta-bar { display: flex; flex-wrap: wrap; gap: 16px; font-size: 0.85rem; color: #78716c; padding-bottom: 24px; border-bottom: 1px solid #f5f5f4; margin-bottom: 32px; }\n" +
                "    .story-body { font-size: 1.08rem; line-height: 1.85; color: #292524; white-space: pre-line; margin-bottom: 40px; }\n" +
                "    .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; margin-bottom: 40px; page-break-inside: avoid; }\n" +
                "    .keepsake-photo-card img { width: 100%; height: 240px; object-fit: cover; border-radius: 8px; border: 1px solid #e7e5e4; }\n" +
                "    .companions-section { background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 16px 20px; margin-bottom: 30px; page-break-inside: avoid; }\n" +
                "    .companions-label { font-size: 0.75rem; font-weight: 700; color: #854d0e; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }\n" +
                "    .companion-pill { display: inline-block; background: #fff; border: 1px solid #fde047; padding: 3px 12px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; color: #713f12; margin-right: 6px; margin-bottom: 4px; }\n" +
                "    .keepsake-footer { text-align: center; padding-top: 30px; border-top: 1px solid #f5f5f4; font-size: 0.75rem; color: #a8a29e; letter-spacing: 0.05em; }\n" +
                "    @media print { body { background: #fff; padding: 0; } .keepsake-container { border: none; box-shadow: none; padding: 0; } .print-btn { display: none; } }\n" +
                "    .print-btn { position: fixed; bottom: 24px; right: 24px; background: #b45309; color: #fff; border: none; padding: 12px 24px; font-size: 0.9rem; font-weight: 600; border-radius: 30px; cursor: pointer; box-shadow: 0 4px 14px rgba(180,83,9,0.3); }\n" +
                "  </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "  <button class=\"print-btn\" onclick=\"window.print()\">Print / Save as PDF</button>\n" +
                "  <div class=\"keepsake-container\">\n" +
                "    <div class=\"header-kicker\">" + safeJourney + "</div>\n" +
                "    <h1 class=\"keepsake-title\">" + safeTitle + "</h1>\n" +
                "    <div class=\"meta-bar\">\n" +
                "      <span>📅 " + formattedDate + "</span>\n" +
                "      <span>📍 " + safeLocation + "</span>\n" +
                "      <span>✍️ Preserved by " + safeCreator + "</span>\n" +
                "    </div>\n" +
                "    <div class=\"story-body\">\n" + safeStory + "\n</div>\n" +
                (companionsHtml.length() > 0 ? "    <div class=\"companions-section\"><div class=\"companions-label\">In This Memory</div>" + companionsHtml + "</div>\n" : "") +
                (mediaHtml.length() > 0 ? "    <div class=\"photo-grid\">" + mediaHtml + "</div>\n" : "") +
                "    <div class=\"keepsake-footer\">MEMORYVERSE ARCHIVE • PRESERVED PERMANENTLY</div>\n" +
                "  </div>\n" +
                "</body>\n" +
                "</html>";
    }

    @Override
    @Transactional(readOnly = true)
    public String generateJourneyKeepsakeHtml(UUID journeyId) {
        JourneyResponseDto j = journeyService.getJourneyById(journeyId);
        String safeTitle = escapeHtml(j.getTitle());
        String safeDesc = escapeHtml(j.getDescription() != null ? j.getDescription() : "");
        String chaptersHtml = renderChapters(j);

        return "<!DOCTYPE html>\n" +
                "<html lang=\"en\">\n" +
                "<head>\n" +
                "  <meta charset=\"UTF-8\">\n" +
                "  <title>" + safeTitle + " — MemoryVerse Journey Anthology</title>\n" +
                "  <style>\n" +
                "    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');\n" +
                "    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #faf8f5; color: #1c1917; padding: 40px 20px; line-height: 1.7; }\n" +
                "    .book-wrap { max-width: 860px; margin: 0 auto; background: #fff; padding: 60px; border-radius: 12px; border: 1px solid #e7e5e4; }\n" +
                "    .book-hero { text-align: center; padding-bottom: 40px; border-bottom: 2px solid #b45309; margin-bottom: 40px; }\n" +
                "    .book-kicker { font-size: 0.8rem; font-weight: 700; color: #b45309; letter-spacing: 0.15em; text-transform: uppercase; }\n" +
                "    .book-title { font-family: 'Playfair Display', serif; font-size: 3rem; margin: 10px 0; color: #1c1917; }\n" +
                "    .book-desc { font-size: 1.1rem; color: #57534e; max-width: 600px; margin: 0 auto; }\n" +
                "    .chapter-card { margin-bottom: 36px; padding: 24px; background: #fdfbf7; border: 1px solid #f5efe6; border-radius: 8px; }\n" +
                "    .chapter-title { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: #1c1917; margin: 0 0 8px; }\n" +
                "    .chapter-desc { font-size: 0.95rem; color: #44403c; margin: 0; }\n" +
                "  </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "  <div class=\"book-wrap\">\n" +
                "    <div class=\"book-hero\">\n" +
                "      <div class=\"book-kicker\">JOURNEY ANTHOLOGY</div>\n" +
                "      <h1 class=\"book-title\">" + safeTitle + "</h1>\n" +
                "      <p class=\"book-desc\">" + safeDesc + "</p>\n" +
                "    </div>\n" +
                "    <div class=\"chapters-list\">" + chaptersHtml + "</div>\n" +
                "  </div>\n" +
                "</body>\n" +
                "</html>";
    }

    private String renderChapters(JourneyResponseDto j) {
        if (j.getSections() == null) return "<p>No chapters recorded.</p>";
        StringBuilder sb = new StringBuilder();
        for (var sec : j.getSections()) {
            sb.append("<div class='chapter-card'>")
              .append("<h2 class='chapter-title'>").append(escapeHtml(sec.getTitle())).append("</h2>")
              .append("<p class='chapter-desc'>").append(escapeHtml(sec.getDescription() != null ? sec.getDescription() : "")).append("</p>")
              .append("</div>");
        }
        return sb.toString();
    }

    private String generateMemoryMarkdown(MemoryResponseDto m) {
        return "# " + m.getTitle() + "\n\n" +
                "**Date:** " + (m.getMemoryDate() != null ? m.getMemoryDate().toString() : "N/A") + "\n" +
                "**Location:** " + (m.getLocationName() != null ? m.getLocationName() : "N/A") + "\n" +
                "**Journey:** " + (m.getJourneyTitle() != null ? m.getJourneyTitle() : "N/A") + "\n\n" +
                "## Story\n\n" +
                (m.getStory() != null ? m.getStory() : "No story text recorded.") + "\n";
    }

    private void addZipEntry(ZipOutputStream zos, String filename, byte[] content) throws IOException {
        ZipEntry entry = new ZipEntry(filename);
        zos.putNextEntry(entry);
        zos.write(content);
        zos.closeEntry();
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
