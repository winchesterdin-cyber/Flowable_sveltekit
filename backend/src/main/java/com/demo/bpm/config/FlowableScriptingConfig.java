package com.demo.bpm.config;

import lombok.extern.slf4j.Slf4j;
import org.flowable.common.engine.impl.scripting.ScriptingEngines;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineFactory;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import java.lang.reflect.Method;
import java.util.List;

/**
 * Flowable-specific configuration for JavaScript scripting support.
 *
 * This configuration provides a custom ScriptingEngines bean that ensures
 * GraalVM JavaScript engine is properly configured for Flowable BPMN processes.
 */
@Slf4j
@Configuration
public class FlowableScriptingConfig {

    /**
     * Creates a custom ScriptingEngines bean for Flowable that uses GraalVM JavaScript.
     * This overrides the default Flowable ScriptingEngines configuration.
     */
    @Bean
    @Primary
    public ScriptingEngines scriptingEngines() {
        log.info("Configuring Flowable ScriptingEngines with GraalVM JavaScript support...");

        // Create ScriptEngineManager with the application classloader
        ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
        if (classLoader == null) {
            classLoader = getClass().getClassLoader();
        }

        ScriptEngineManager scriptEngineManager = new ScriptEngineManager(classLoader);

        // CRITICAL FIX: Manually instantiate and register GraalVM JavaScript factory
        // This bypasses the service loader mechanism which may fail in Spring Boot fat JARs
        try {
            log.info("Attempting to manually instantiate GraalVM JavaScript engine factory...");

            // Try to load the GraalJSScriptEngineFactory class directly
            Class<?> factoryClass = Class.forName(
                "com.oracle.truffle.js.scriptengine.GraalJSScriptEngineFactory",
                true,
                classLoader
            );

            ScriptEngineFactory graalFactory = (ScriptEngineFactory) factoryClass.getDeclaredConstructor().newInstance();
            log.info("Successfully instantiated GraalVM JavaScript factory: {}", graalFactory.getEngineName());

            // Register the factory under all common JavaScript names
            scriptEngineManager.registerEngineName("javascript", graalFactory);
            scriptEngineManager.registerEngineName("JavaScript", graalFactory);
            scriptEngineManager.registerEngineName("js", graalFactory);
            scriptEngineManager.registerEngineName("JS", graalFactory);
            scriptEngineManager.registerEngineName("ecmascript", graalFactory);
            scriptEngineManager.registerEngineName("graal.js", graalFactory);
            scriptEngineManager.registerEngineName("Graal.js", graalFactory);
            scriptEngineManager.registerEngineName("GraalJS", graalFactory);

            log.info("GraalVM JavaScript factory registered under all common names");

            // Test the engine
            ScriptEngine testEngine = scriptEngineManager.getEngineByName("javascript");
            if (testEngine != null) {
                testJavaScriptEngine(testEngine);
            }

        } catch (Exception e) {
            log.error("Failed to manually instantiate GraalVM JavaScript factory: {}", e.getMessage());
            log.error("Falling back to automatic discovery...");

            // Fallback: Try automatic discovery
            List<ScriptEngineFactory> factories = scriptEngineManager.getEngineFactories();
            log.info("ScriptEngineManager found {} engine(s) via service loader:", factories.size());
            for (ScriptEngineFactory factory : factories) {
                log.info("  - {} v{}: names={}",
                    factory.getEngineName(),
                    factory.getEngineVersion(),
                    factory.getNames());
            }

            // Try to find and configure JavaScript engine
            ScriptEngine jsEngine = findJavaScriptEngine(scriptEngineManager);
            if (jsEngine != null) {
                log.info("JavaScript engine configured for Flowable: {} v{}",
                    jsEngine.getFactory().getEngineName(),
                    jsEngine.getFactory().getEngineVersion());

                // Register additional names to ensure Flowable can find it
                scriptEngineManager.registerEngineName("javascript", jsEngine.getFactory());
                scriptEngineManager.registerEngineName("JavaScript", jsEngine.getFactory());
                scriptEngineManager.registerEngineName("js", jsEngine.getFactory());
                scriptEngineManager.registerEngineName("ecmascript", jsEngine.getFactory());

                // Test the engine
                testJavaScriptEngine(jsEngine);
            } else {
                log.error("CRITICAL: No JavaScript engine found for Flowable!");
                log.error("BPMN script tasks using 'javascript' will fail.");
            }
        }

        // Create Flowable ScriptingEngines with our configured manager
        ScriptingEngines scriptingEngines = new ScriptingEngines(scriptEngineManager);

        log.info("Flowable ScriptingEngines configured successfully");
        return scriptingEngines;
    }

    private ScriptEngine findJavaScriptEngine(ScriptEngineManager manager) {
        // Try standard names
        String[] names = {"graal.js", "Graal.js", "js", "JavaScript", "javascript", "GraalJS", "graaljs"};
        for (String name : names) {
            ScriptEngine engine = manager.getEngineByName(name);
            if (engine != null) {
                log.info("Found JavaScript engine with name: '{}'", name);
                return engine;
            }
        }

        // Try by MIME type
        ScriptEngine engine = manager.getEngineByMimeType("application/javascript");
        if (engine != null) {
            log.info("Found JavaScript engine by MIME type");
            return engine;
        }

        // Try by extension
        engine = manager.getEngineByExtension("js");
        if (engine != null) {
            log.info("Found JavaScript engine by extension");
            return engine;
        }

        return null;
    }

    private void testJavaScriptEngine(ScriptEngine engine) {
        try {
            // Basic test
            Object result = engine.eval("2 + 2");
            log.info("JavaScript engine basic test (2+2): {}", result);

            // Test variable binding
            engine.put("testValue", 42);
            Object bound = engine.eval("testValue");
            log.info("JavaScript engine binding test: {}", bound);

            // Test Java.to for array conversion (used in BPMN processes)
            try {
                engine.eval("var arr = ['a', 'b', 'c']; var javaArr = Java.to(arr, 'java.lang.String[]');");
                log.info("JavaScript Java.to() array conversion: SUCCESS");
            } catch (ScriptException e) {
                log.warn("JavaScript Java.to() test failed (may need nashorn-compat mode): {}", e.getMessage());
            }

            log.info("JavaScript engine tests completed successfully");
        } catch (Exception e) {
            log.error("JavaScript engine test failed: {}", e.getMessage(), e);
        }
    }
}
