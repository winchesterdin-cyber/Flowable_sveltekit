package com.demo.bpm.util;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;

class StructuredLoggerTest {
    @Test
    void formatContext_sortsKeysAndFormatsValues() {
        Map<String, Object> context = Map.of(
                "zeta", 2,
                "alpha", "value",
                "count", 5
        );

        String formatted = StructuredLogger.formatContext(context);

        assertThat(formatted).isEqualTo(" [alpha=value, count=5, zeta=2]");
    }

    @Test
    void formatContext_returnsEmptyForNullOrEmpty() {
        assertThat(StructuredLogger.formatContext(null)).isEmpty();
        assertThat(StructuredLogger.formatContext(Map.of())).isEmpty();
    }
}
