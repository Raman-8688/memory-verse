package com.memoryverse.controller;

import com.memoryverse.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/export")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService exportService;

    @GetMapping(value = "/memory/{id}/zip", produces = "application/zip")
    public ResponseEntity<byte[]> exportMemoryZip(@PathVariable UUID id) {
        byte[] zipData = exportService.exportMemoryZip(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"memory-" + id + "-archive.zip\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(zipData);
    }

    @GetMapping(value = "/journey/{id}/zip", produces = "application/zip")
    public ResponseEntity<byte[]> exportJourneyZip(@PathVariable UUID id) {
        byte[] zipData = exportService.exportJourneyZip(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"journey-" + id + "-archive.zip\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(zipData);
    }

    @GetMapping(value = "/memory/{id}/book", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> getMemoryKeepsakeHtml(@PathVariable UUID id) {
        String html = exportService.generateMemoryKeepsakeHtml(id);
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(html);
    }

    @GetMapping(value = "/journey/{id}/book", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> getJourneyKeepsakeHtml(@PathVariable UUID id) {
        String html = exportService.generateJourneyKeepsakeHtml(id);
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(html);
    }
}
