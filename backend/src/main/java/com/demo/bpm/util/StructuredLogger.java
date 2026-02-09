package com.demo.bpm.util;

import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.slf4j.Logger;

/**
 * Centralized helper for consistent, structured log formatting.
 * Keeps log output stable by sorting keys and using a single format.
 */
public final class StructuredLogger {
    private StructuredLogger() {
        // Utility class; no instantiation.
    }

    /**
     * Format a context map into a stable, readable key=value list.
     */
    public static String formatContext(Map<String, ?> context) {
        if (context == null || context.isEmpty()) {
            return "";
        }

        Map<String, ?> sorted = new TreeMap<>(context);
        String payload = sorted.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + String.valueOf(entry.getValue()))
                .collect(Collectors.joining(", "));
        return " [" + payload + "]";
    }

    /**
     * Log a structured info message with context.
     */
    public static void info(Logger logger, String message, Map<String, ?> context) {
        logger.info("{}{}", message, formatContext(context));
    }

    /**
     * Log a structured warning message with context.
     */
    public static void warn(Logger logger, String message, Map<String, ?> context) {
        logger.warn("{}{}", message, formatContext(context));
    }

    /**
     * Log a structured error message with context.
     */
    public static void error(Logger logger, String message, Map<String, ?> context) {
        logger.error("{}{}", message, formatContext(context));
    }
}
