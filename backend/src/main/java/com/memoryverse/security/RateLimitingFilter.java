package com.memoryverse.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.memoryverse.dto.response.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * High-performance, lightweight Rate Limiting Filter.
 * - Protects /api/auth/** endpoints from brute-force authentication attacks (max 5 requests/min per IP).
 * - Protects /api/ai/** endpoints from token credit depletion & abuse (max 10 requests/min per user/IP).
 */
@Slf4j
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final int AUTH_LIMIT_PER_MINUTE = 5;
    private static final int AI_LIMIT_PER_MINUTE = 10;
    private static final long WINDOW_MILLIS = 60_000L;

    private final Map<String, WindowCounter> requestCounts = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    private static class WindowCounter {
        final long windowStart;
        final AtomicInteger count;

        WindowCounter(long windowStart) {
            this.windowStart = windowStart;
            this.count = new AtomicInteger(1);
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method)) {
            if (path.contains("/auth/")) {
                String clientIp = getClientIp(request);
                String rateKey = "auth:" + clientIp;
                if (isRateLimited(rateKey, AUTH_LIMIT_PER_MINUTE)) {
                    log.warn("Rate limit exceeded for authentication attempts from IP: {} on path: {}", clientIp, path);
                    sendRateLimitResponse(request, response, "Too many login attempts. Please wait a minute before trying again.");
                    return;
                }
            } else if (path.contains("/ai/")) {
                String identifier = SecurityUtils.getCurrentUserPrincipal()
                        .map(p -> p.getId().toString())
                        .orElseGet(() -> getClientIp(request));
                String rateKey = "ai:" + identifier;
                if (isRateLimited(rateKey, AI_LIMIT_PER_MINUTE)) {
                    log.warn("Rate limit exceeded for AI request by: {} on path: {}", identifier, path);
                    sendRateLimitResponse(request, response, "Rate limit exceeded for AI assistant. Please wait a moment before trying again.");
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isRateLimited(String key, int maxRequests) {
        long now = System.currentTimeMillis();
        cleanOldWindows(now);

        WindowCounter counter = requestCounts.compute(key, (k, existing) -> {
            if (existing == null || (now - existing.windowStart) > WINDOW_MILLIS) {
                return new WindowCounter(now);
            }
            existing.count.incrementAndGet();
            return existing;
        });

        return counter.count.get() > maxRequests;
    }

    private void cleanOldWindows(long now) {
        if (requestCounts.size() > 500) {
            requestCounts.entrySet().removeIf(entry -> (now - entry.getValue().windowStart) > WINDOW_MILLIS * 2);
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private void sendRateLimitResponse(HttpServletRequest request, HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", "60");

        ApiError error = ApiError.builder()
                .status(HttpStatus.TOO_MANY_REQUESTS.value())
                .error("Too Many Requests")
                .message(message)
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();

        response.getWriter().write(objectMapper.writeValueAsString(error));
    }
}
