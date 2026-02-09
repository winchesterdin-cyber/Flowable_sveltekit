package com.demo.bpm.config;

import com.demo.bpm.util.StructuredLogger;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Logs request start and end with latency for API visibility.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        long start = System.currentTimeMillis();
        Map<String, Object> startContext = new HashMap<>();
        startContext.put("method", request.getMethod());
        startContext.put("path", request.getRequestURI());
        startContext.put("query", request.getQueryString());
        startContext.put("timestamp", Instant.now().toString());
        StructuredLogger.info(log, "Request start", startContext);

        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = System.currentTimeMillis() - start;
            Map<String, Object> endContext = new HashMap<>();
            endContext.put("method", request.getMethod());
            endContext.put("path", request.getRequestURI());
            endContext.put("status", response.getStatus());
            endContext.put("durationMs", durationMs);
            StructuredLogger.info(log, "Request end", endContext);
        }
    }
}
