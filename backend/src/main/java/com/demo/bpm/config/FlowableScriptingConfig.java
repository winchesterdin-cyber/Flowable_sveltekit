package com.demo.bpm.config;

import lombok.extern.slf4j.Slf4j;
import org.flowable.common.engine.impl.scripting.ScriptingEngines;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineFactory;
import javax.script.ScriptEngineManager;
import java.util.List;

/**
 * Flowable-specific configuration for JavaScript scripting support.
 *
 * Uses Nashorn JavaScript engine (org.openjdk.nashorn:nashorn-core) for Java 17+.
 * Reference: https://documentation.flowable.com/latest/admin/installs/platform-full/javascript-for-scripting
 */
@Slf4j
@Configuration
public class FlowableScriptingConfig {

    /**
     * Creates a custom ScriptingEngines bean for Flowable that uses Nashorn JavaScript.
     * Nashorn automatically registers itself via JSR-223 service provider mechanism.
     */
    @Bean
    @Primary
    public ScriptingEngines scriptingEngines() {
        log.info("Configuring Flowable ScriptingEngines with Nashorn JavaScript support...");

        // Create ScriptEngineManager with the application classloader
        ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
        if (classLoader == null) {
            classLoader = getClass().getClassLoader();
        }

        ScriptEngineManager scriptEngineManager = new ScriptEngineManager(classLoader);

        // Log available script engines
        List<ScriptEngineFactory> factories = scriptEngineManager.getEngineFactories();
        log.info("ScriptEngineManager found {} engine(s):", factories.size());
        for (ScriptEngineFactory factory : factories) {
            log.info("  - {} v{}: names={}",
                factory.getEngineName(),
                factory.getEngineVersion(),
                factory.getNames());
        }

        // Verify JavaScript engine is available
        ScriptEngine jsEngine = scriptEngineManager.getEngineByName("javascript");
        if (jsEngine != null) {
            log.info("JavaScript engine configured for Flowable: {} v{}",
                jsEngine.getFactory().getEngineName(),
                jsEngine.getFactory().getEngineVersion());

            // Test the engine
            testJavaScriptEngine(jsEngine);
        } else {
            log.error("CRITICAL: No JavaScript engine found for Flowable!");
            log.error("Ensure org.openjdk.nashorn:nashorn-core is in the classpath.");
            log.error("BPMN script tasks using 'javascript' will fail.");
        }

        // Create Flowable ScriptingEngines with our configured manager
        ScriptingEngines scriptingEngines = new ScriptingEngines(scriptEngineManager);

        log.info("Flowable ScriptingEngines configured successfully");
        return scriptingEngines;
    }

    private void testJavaScriptEngine(ScriptEngine engine) {
        try {
            // Basic test
            Object result = engine.eval("2 + 2");
            log.info("JavaScript engine basic test (2+2): {}", result);

            // Test variable binding (critical for Flowable execution context)
            engine.put("testValue", 42);
            Object bound = engine.eval("testValue");
            log.info("JavaScript engine binding test: {}", bound);

            log.info("JavaScript engine tests completed successfully");
        } catch (Exception e) {
            log.error("JavaScript engine test failed: {}", e.getMessage(), e);
        }
    }
}
