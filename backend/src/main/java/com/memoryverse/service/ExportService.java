package com.memoryverse.service;

import java.util.UUID;

public interface ExportService {

    byte[] exportMemoryZip(UUID memoryId);

    byte[] exportJourneyZip(UUID journeyId);

    String generateMemoryKeepsakeHtml(UUID memoryId);

    String generateJourneyKeepsakeHtml(UUID journeyId);
}
