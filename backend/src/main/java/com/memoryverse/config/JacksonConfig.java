package com.memoryverse.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Configuration
public class JacksonConfig {

    public static class FlexibleLocalDateDeserializer extends JsonDeserializer<LocalDate> {
        @Override
        public LocalDate deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
            String dateStr = p.getText();
            if (dateStr == null || dateStr.trim().isEmpty()) {
                return null;
            }
            dateStr = dateStr.trim();

            // Handle standard ISO YYYY-MM-DD
            if (dateStr.length() >= 10 && dateStr.charAt(4) == '-' && dateStr.charAt(7) == '-') {
                try {
                    return LocalDate.parse(dateStr.substring(0, 10), DateTimeFormatter.ISO_LOCAL_DATE);
                } catch (Exception ignored) {}
            }

            // Handle ISO Instant / OffsetDateTime (e.g. 2026-09-15T11:08:49.975Z)
            try {
                return Instant.parse(dateStr).atZone(ZoneId.systemDefault()).toLocalDate();
            } catch (Exception ignored) {}

            // Handle standard substring
            if (dateStr.length() >= 10) {
                try {
                    return LocalDate.parse(dateStr.substring(0, 10));
                } catch (Exception ignored) {}
            }

            // Handle epoch timestamp in milliseconds
            try {
                long timestamp = Long.parseLong(dateStr);
                return Instant.ofEpochMilli(timestamp).atZone(ZoneId.systemDefault()).toLocalDate();
            } catch (Exception ignored) {}

            return null;
        }
    }

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper objectMapper = new ObjectMapper();
        JavaTimeModule javaTimeModule = new JavaTimeModule();
        javaTimeModule.addDeserializer(LocalDate.class, new FlexibleLocalDateDeserializer());
        javaTimeModule.addSerializer(LocalDate.class, new LocalDateSerializer(DateTimeFormatter.ISO_LOCAL_DATE));
        objectMapper.registerModule(javaTimeModule);
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return objectMapper;
    }
}
