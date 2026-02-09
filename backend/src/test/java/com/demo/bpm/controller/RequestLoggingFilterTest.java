package com.demo.bpm.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.demo.bpm.config.RequestLoggingFilter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@ExtendWith(OutputCaptureExtension.class)
class RequestLoggingFilterTest {

    @RestController
    static class TestController {
        @GetMapping("/test")
        ResponseEntity<String> test() {
            return ResponseEntity.ok("ok");
        }
    }

    @Test
    void logsRequestStartAndEnd(CapturedOutput output) throws Exception {
        MockMvc mockMvc = MockMvcBuilders
                .standaloneSetup(new TestController())
                .addFilters(new RequestLoggingFilter())
                .build();

        mockMvc.perform(get("/test"))
                .andExpect(status().isOk());

        assertThat(output.getOut()).contains("Request start");
        assertThat(output.getOut()).contains("Request end");
    }
}
