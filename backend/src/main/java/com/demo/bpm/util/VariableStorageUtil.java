package com.demo.bpm.util;

import java.util.HashMap;
import java.util.Map;

/**
 * Utility class for filtering process variables based on storage convention.
 *
 * Convention:
 * - Variables starting with '_' (underscore) are system variables stored in Flowable's act_ru_variable
 * - All other variables are stored only in document/grid_rows tables (not in Flowable)
 */
public final class VariableStorageUtil {

    private VariableStorageUtil() {
        // Utility class, no instantiation
    }

    /**
     * Prefix for system variables that should be stored in Flowable's act_ru_variable table.
     */
    public static final String SYSTEM_VAR_PREFIX = "_";

    /**
     * Filters variables to only include system variables (those starting with '_').
     * These are the variables that will be stored in Flowable's act_ru_variable table.
     *
     * @param variables All variables from form submission
     * @return Map containing only system variables (keys starting with '_')
     */
    public static Map<String, Object> filterSystemVariables(Map<String, Object> variables) {
        if (variables == null || variables.isEmpty()) {
            return new HashMap<>();
        }

        Map<String, Object> systemVars = new HashMap<>();
        for (Map.Entry<String, Object> entry : variables.entrySet()) {
            if (isSystemVariable(entry.getKey())) {
                systemVars.put(entry.getKey(), entry.getValue());
            }
        }
        return systemVars;
    }

    /**
     * Filters variables to only include business variables (those NOT starting with '_').
     * These are the variables that will be stored in document/grid_rows tables only.
     *
     * @param variables All variables from form submission
     * @return Map containing only business variables (keys not starting with '_')
     */
    public static Map<String, Object> filterBusinessVariables(Map<String, Object> variables) {
        if (variables == null || variables.isEmpty()) {
            return new HashMap<>();
        }

        Map<String, Object> businessVars = new HashMap<>();
        for (Map.Entry<String, Object> entry : variables.entrySet()) {
            if (!isSystemVariable(entry.getKey())) {
                businessVars.put(entry.getKey(), entry.getValue());
            }
        }
        return businessVars;
    }

    /**
     * Checks if a variable name is a system variable (should be stored in Flowable).
     *
     * @param variableName The variable name to check
     * @return true if the variable starts with '_', false otherwise
     */
    public static boolean isSystemVariable(String variableName) {
        return variableName != null && variableName.startsWith(SYSTEM_VAR_PREFIX);
    }

    /**
     * Checks if a variable name is a business variable (should only be stored in document/grid_rows).
     *
     * @param variableName The variable name to check
     * @return true if the variable does not start with '_', false otherwise
     */
    public static boolean isBusinessVariable(String variableName) {
        return variableName != null && !variableName.startsWith(SYSTEM_VAR_PREFIX);
    }
}
