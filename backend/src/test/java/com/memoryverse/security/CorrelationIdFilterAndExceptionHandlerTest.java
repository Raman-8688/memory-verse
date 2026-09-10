package com.memoryverse.security;

import com.memoryverse.dto.response.ApiError;
import com.memoryverse.exception.GlobalExceptionHandler;
import com.memoryverse.exception.ResourceNotFoundException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.io.IOException;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CorrelationIdFilterAndExceptionHandlerTest {

    private CorrelationIdFilter correlationIdFilter;
    private GlobalExceptionHandler globalExceptionHandler;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        correlationIdFilter = new CorrelationIdFilter();
        globalExceptionHandler = new GlobalExceptionHandler();
        MDC.clear();
    }

    @Test
    @DisplayName("CorrelationIdFilter generates UUID when incoming request lacks X-Correlation-Id")
    void testFilterGeneratesCorrelationIdWhenMissing() throws ServletException, IOException {
        when(request.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER)).thenReturn(null);

        doAnswer(invocation -> {
            String mdcValue = MDC.get(CorrelationIdFilter.MDC_CORRELATION_ID_KEY);
            assertNotNull(mdcValue);
            assertDoesNotThrow(() -> UUID.fromString(mdcValue));
            return null;
        }).when(filterChain).doFilter(request, response);

        correlationIdFilter.doFilter(request, response, filterChain);

        verify(response).setHeader(eq(CorrelationIdFilter.CORRELATION_ID_HEADER), anyString());
        assertNull(MDC.get(CorrelationIdFilter.MDC_CORRELATION_ID_KEY), "MDC should be cleared after request execution");
    }

    @Test
    @DisplayName("CorrelationIdFilter preserves valid incoming X-Correlation-Id")
    void testFilterPreservesValidCorrelationId() throws ServletException, IOException {
        String existingId = "client-trace-123456789";
        when(request.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER)).thenReturn(existingId);

        doAnswer(invocation -> {
            String mdcValue = MDC.get(CorrelationIdFilter.MDC_CORRELATION_ID_KEY);
            assertEquals(existingId, mdcValue);
            return null;
        }).when(filterChain).doFilter(request, response);

        correlationIdFilter.doFilter(request, response, filterChain);

        verify(response).setHeader(CorrelationIdFilter.CORRELATION_ID_HEADER, existingId);
        assertNull(MDC.get(CorrelationIdFilter.MDC_CORRELATION_ID_KEY));
    }

    @Test
    @DisplayName("GlobalExceptionHandler includes correlationId in ApiError response")
    void testGlobalExceptionHandlerIncludesCorrelationId() {
        String testCid = "err-trace-999";
        MDC.put(CorrelationIdFilter.MDC_CORRELATION_ID_KEY, testCid);

        when(request.getRequestURI()).thenReturn("/api/chat/groups/123/messages");

        ResourceNotFoundException ex = new ResourceNotFoundException("Message not found");
        ResponseEntity<ApiError> responseEntity = globalExceptionHandler.handleResourceNotFoundException(ex, request);

        assertNotNull(responseEntity);
        assertEquals(HttpStatus.NOT_FOUND, responseEntity.getStatusCode());
        ApiError error = responseEntity.getBody();
        assertNotNull(error);
        assertEquals(testCid, error.getCorrelationId());
        assertEquals("Message not found", error.getMessage());
        assertEquals("/api/chat/groups/123/messages", error.getPath());
    }
}
