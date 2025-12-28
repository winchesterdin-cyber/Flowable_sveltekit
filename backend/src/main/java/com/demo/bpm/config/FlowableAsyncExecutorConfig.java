package com.demo.bpm.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.ProcessEngine;
import org.flowable.job.service.impl.asyncexecutor.AsyncExecutor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;

/**
 * Configuration to start the Flowable async executor after the application is fully ready.
 * This reduces memory pressure during startup by delaying the executor initialization.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class FlowableAsyncExecutorConfig {

    private final ProcessEngine processEngine;

    /**
     * Start the async executor after the application is fully ready.
     * This is done with a lower priority than demo data initialization to ensure
     * the application is completely stable before starting background job processing.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Order(100)  // Run after other ApplicationReadyEvent handlers
    public void startAsyncExecutor() {
        try {
            // Wait a bit for the application to stabilize
            Thread.sleep(3000);

            AsyncExecutor asyncExecutor = processEngine.getProcessEngineConfiguration().getAsyncExecutor();
            if (asyncExecutor != null && !asyncExecutor.isActive()) {
                log.info("Starting Flowable async executor...");
                asyncExecutor.start();
                log.info("Flowable async executor started successfully");
            } else if (asyncExecutor == null) {
                log.warn("Async executor is not configured");
            } else {
                log.info("Async executor is already active");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Interrupted while waiting to start async executor");
        } catch (Exception e) {
            log.error("Failed to start async executor: {}", e.getMessage(), e);
        }
    }
}
