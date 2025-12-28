package com.demo.bpm.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineFactory;
import javax.script.ScriptEngineManager;
import java.util.List;

/**
 * Configuration for Nashorn JavaScript engine.
 *
 * Required for Java 17+ since the bundled Nashorn was removed in Java 15.
 * Uses org.openjdk.nashorn:nashorn-core as recommended by Flowable documentation.
 * Reference: https://documentation.flowable.com/latest/admin/installs/platform-full/javascript-for-scripting
 */
@Slf4j
@Configuration
@Order(1)
public class NashornConfig {

    @PostConstruct
    public void verifyNashornAvailability() {
        log.info("Verifying Nashorn JavaScript engine availability...");

        try {
            ClassLoader contextClassLoader = Thread.currentThread().getContextClassLoader();
            ScriptEngineManager manager = new ScriptEngineManager(contextClassLoader);

            // Log all available script engines
            logAvailableEngines(manager);

            // Verify JavaScript engine is available
            ScriptEngine engine = manager.getEngineByName("nashorn");
            if (engine == null) {
                engine = manager.getEngineByName("javascript");
            }

            if (engine != null) {
                log.info("Nashorn JavaScript engine successfully loaded!");
                log.info("  Engine Name: {}", engine.getFactory().getEngineName());
                log.info("  Engine Version: {}", engine.getFactory().getEngineVersion());
                log.info("  Language: {} v{}",
                    engine.getFactory().getLanguageName(),
                    engine.getFactory().getLanguageVersion());

                // Test the engine
                testEngine(engine);
            } else {
                log.warn("========================================");
                log.warn("JavaScript engine not found!");
                log.warn("BPMN script tasks may fail at runtime.");
                log.warn("========================================");
                log.warn("Ensure org.openjdk.nashorn:nashorn-core is in the classpath.");
            }
        } catch (Exception e) {
            log.warn("Error during JavaScript engine verification: {}", e.getMessage());
            log.debug("Full stack trace:", e);
        }
    }

    private void logAvailableEngines(ScriptEngineManager manager) {
        List<ScriptEngineFactory> factories = manager.getEngineFactories();
        if (factories.isEmpty()) {
            log.warn("No script engines found in ScriptEngineManager!");
        } else {
            log.info("Available script engines ({}):", factories.size());
            for (ScriptEngineFactory factory : factories) {
                log.info("  - {} v{} [names: {}, extensions: {}]",
                    factory.getEngineName(),
                    factory.getEngineVersion(),
                    factory.getNames(),
                    factory.getExtensions());
            }
        }
    }

    private void testEngine(ScriptEngine engine) {
        try {
            Object result = engine.eval("1 + 1");
            log.info("JavaScript engine test (1+1): {}", result);

            engine.put("testVar", 42);
            Object retrieved = engine.eval("testVar");
            log.info("JavaScript engine Java interop test: {}", retrieved);

            log.info("JavaScript engine is fully operational!");
        } catch (Exception e) {
            log.warn("JavaScript engine test failed: {}", e.getMessage());
            log.debug("Script tasks may not work correctly", e);
        }
    }
}
