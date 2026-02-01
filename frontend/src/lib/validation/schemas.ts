/**
 * Zod Validation Schemas for Process Data
 *
 * All fields and grids are VISIBLE by default.
 * Visibility, ReadOnly, and Required must be explicitly declared.
 *
 * These schemas work both client-side and server-side (SvelteKit).
 */

import { z } from 'zod';

// ==================== Field Validation Schema ====================

/**
 * Field state validation - controls visibility, readonly, and required states
 * All fields are visible and editable by default
 */
export const fieldStateSchema = z.object({
  // Field is visible by default (true)
  visible: z.boolean().default(true),

  // Field is editable by default (readonly = false)
  readonly: z.boolean().default(false),

  // Field is optional by default (required = false)
  required: z.boolean().default(false)
});

export type FieldState = z.infer<typeof fieldStateSchema>;

/**
 * Field value constraints - min/max, patterns, etc.
 */
export const fieldConstraintsSchema = z.object({
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
  customExpression: z.string().optional(),
  customMessage: z.string().optional()
});

export type FieldConstraints = z.infer<typeof fieldConstraintsSchema>;

/**
 * Complete field validation configuration
 */
export const fieldValidationSchema = fieldStateSchema.merge(fieldConstraintsSchema);

export type FieldValidation = z.infer<typeof fieldValidationSchema>;

/**
 * Field option for select/radio/checkbox fields
 */
export const fieldOptionSchema = z.object({
  value: z.string(),
  label: z.string()
});

export type FieldOption = z.infer<typeof fieldOptionSchema>;

/**
 * Field types supported by the form system
 */
export const fieldTypeEnum = z.enum([
  'text',
  'number',
  'email',
  'date',
  'datetime',
  'checkbox',
  'select',
  'textarea',
  'radio',
  'hidden',
  'file',
  'password',
  'tel',
  'url'
]);

export type FieldType = z.infer<typeof fieldTypeEnum>;

/**
 * Complete field definition with validation
 */
export const fieldDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  type: fieldTypeEnum,

  // Validation rules (visible, readonly, required + constraints)
  validation: fieldValidationSchema.default({
    visible: true,
    readonly: false,
    required: false
  }),

  // Options for select/radio fields
  options: z.array(fieldOptionSchema).optional(),

  // Default value
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  defaultExpression: z.string().optional(),

  // Conditional expressions (evaluated at runtime)
  visibleWhen: z.string().optional(), // e.g., "${amount > 1000}"
  readonlyWhen: z.string().optional(), // e.g., "${status == 'approved'}"
  requiredWhen: z.string().optional(), // e.g., "${category == 'premium'}"

  // Layout
  gridColumn: z.number().optional(),
  gridRow: z.number().optional(),
  gridWidth: z.number().default(1),
  cssClass: z.string().optional(),

  // UI hints
  placeholder: z.string().optional(),
  tooltip: z.string().optional()
});

export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;

// ==================== Grid Validation Schema ====================

/**
 * Grid state validation - controls visibility and readonly for entire grid
 */
export const gridStateSchema = z.object({
  visible: z.boolean().default(true),
  readonly: z.boolean().default(false),
  minRows: z.number().default(0),
  maxRows: z.number().optional()
});

export type GridState = z.infer<typeof gridStateSchema>;

/**
 * Grid column definition (uses field definition schema)
 */
export const gridColumnSchema = fieldDefinitionSchema;

export type GridColumn = z.infer<typeof gridColumnSchema>;

/**
 * Complete grid definition with validation
 */
export const gridDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),

  // Grid-level validation
  validation: gridStateSchema.default({
    visible: true,
    readonly: false,
    minRows: 0
  }),

  // Column definitions
  columns: z.array(gridColumnSchema),

  // Conditional expressions
  visibleWhen: z.string().optional(),
  readonlyWhen: z.string().optional(),

  // Layout
  cssClass: z.string().optional()
});

export type GridDefinition = z.infer<typeof gridDefinitionSchema>;

// ==================== Document Type Schema ====================

/**
 * Document type definition - represents a form/document type within a process
 */
export const documentTypeSchema = z.object({
  type: z.string(),
  label: z.string(),
  description: z.string().optional(),

  // Fields in this document type
  fields: z.array(fieldDefinitionSchema),

  // Grids in this document type
  grids: z.array(gridDefinitionSchema)
});

export type DocumentType = z.infer<typeof documentTypeSchema>;

// ==================== Condition Rule Schema ====================

/**
 * Target for condition rules - what the rule affects
 */
export const conditionTargetSchema = z.object({
  type: z.enum(['all', 'document', 'field', 'grid', 'column']),
  documentType: z.string().optional(),
  fieldId: z.string().optional(),
  gridId: z.string().optional(),
  columnId: z.string().optional()
});

export type ConditionTarget = z.infer<typeof conditionTargetSchema>;

/**
 * Effect types for condition rules
 */
export const conditionEffectEnum = z.enum([
  'hidden',
  'visible',
  'readonly',
  'editable',
  'required',
  'optional'
]);

export type ConditionEffect = z.infer<typeof conditionEffectEnum>;

/**
 * Condition rule definition
 */
export const conditionRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  condition: z.string(), // Expression to evaluate
  effect: conditionEffectEnum,
  target: conditionTargetSchema,
  priority: z.number().default(0),
  enabled: z.boolean().default(true)
});

export type ConditionRule = z.infer<typeof conditionRuleSchema>;

// ==================== Process Form Configuration Schema ====================

/**
 * Complete process form configuration
 */
export const processFormConfigSchema = z.object({
  processDefinitionKey: z.string(),

  // Document types available for this process
  documentTypes: z.array(documentTypeSchema),

  // Global condition rules
  conditionRules: z.array(conditionRuleSchema)
});

export type ProcessFormConfig = z.infer<typeof processFormConfigSchema>;

// ==================== Validation Result Schema ====================

/**
 * Validation error structure
 */
export const validationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional()
});

export type ValidationError = z.infer<typeof validationErrorSchema>;

/**
 * Validation result structure
 */
export const validationResultSchema = z.object({
  success: z.boolean(),
  errors: z.array(z.any()).default([]),
  data: z.record(z.string(), z.unknown()).optional()
});

export type ValidationResult = z.infer<typeof validationResultSchema>;

// ==================== Computed State Schemas ====================

/**
 * Computed field state after evaluating all conditions
 */
export const computedFieldStateSchema = z.object({
  fieldId: z.string(),
  visible: z.boolean(),
  readonly: z.boolean(),
  required: z.boolean()
});

export type ComputedFieldState = z.infer<typeof computedFieldStateSchema>;

/**
 * Computed grid state after evaluating all conditions
 */
export const computedGridStateSchema = z.object({
  gridId: z.string(),
  visible: z.boolean(),
  readonly: z.boolean(),
  columns: z.array(computedFieldStateSchema)
});

export type ComputedGridState = z.infer<typeof computedGridStateSchema>;

// ==================== Default Values ====================

/**
 * Default field validation - visible, editable, optional
 */
export const defaultFieldValidation: FieldValidation = {
  visible: true,
  readonly: false,
  required: false
};

/**
 * Default grid validation - visible, editable, no min/max rows
 */
export const defaultGridValidation: GridState = {
  visible: true,
  readonly: false,
  minRows: 0
};
