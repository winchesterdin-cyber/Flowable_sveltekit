/**
 * Dynamic Validation with Zod
 *
 * Creates Zod schemas dynamically based on field definitions.
 * Works both client-side and server-side in SvelteKit.
 */

import { z, type ZodTypeAny } from 'zod';
import type { FieldDefinition, GridDefinition, ComputedFieldState } from './schemas';

/**
 * Creates a Zod schema for validating a single field value based on its definition
 */
export function createFieldValueSchema(
	field: FieldDefinition,
	computedState?: ComputedFieldState
): ZodTypeAny {
	const { validation, type } = field;

	// If field is hidden, any value is valid (including undefined)
	if (computedState && !computedState.visible) {
		return z.any().optional();
	}

	// If field is readonly, skip validation
	if (computedState?.readonly || validation.readonly) {
		return z.any().optional();
	}

	const isRequired = computedState?.required ?? validation.required;

	let schema: ZodTypeAny;

	// Base type schema based on field type
	switch (type) {
		case 'number':
			schema = z.coerce.number({ invalid_type_error: 'Must be a number' });
			if (validation.min !== undefined) {
				schema = (schema as z.ZodNumber).min(
					validation.min,
					`Must be at least ${validation.min}`
				);
			}
			if (validation.max !== undefined) {
				schema = (schema as z.ZodNumber).max(
					validation.max,
					`Must be at most ${validation.max}`
				);
			}
			break;

		case 'email':
			schema = z.string().email('Invalid email address');
			if (validation.minLength !== undefined) {
				schema = (schema as z.ZodString).min(
					validation.minLength,
					`Must be at least ${validation.minLength} characters`
				);
			}
			if (validation.maxLength !== undefined) {
				schema = (schema as z.ZodString).max(
					validation.maxLength,
					`Must be at most ${validation.maxLength} characters`
				);
			}
			break;

		case 'url':
			schema = z.string().url('Invalid URL');
			break;

		case 'date':
		case 'datetime':
			schema = z.coerce.date({ invalid_type_error: 'Invalid date' });
			break;

		case 'checkbox':
			schema = z.boolean();
			break;

		case 'tel':
			schema = z.string();
			if (validation.pattern) {
				schema = (schema as z.ZodString).regex(
					new RegExp(validation.pattern),
					validation.patternMessage || 'Invalid phone number'
				);
			}
			break;

		case 'hidden':
			return z.any().optional();

		default: // text, textarea, select, radio, password
			schema = z.string();
			if (validation.minLength !== undefined) {
				schema = (schema as z.ZodString).min(
					validation.minLength,
					`Must be at least ${validation.minLength} characters`
				);
			}
			if (validation.maxLength !== undefined) {
				schema = (schema as z.ZodString).max(
					validation.maxLength,
					`Must be at most ${validation.maxLength} characters`
				);
			}
			if (validation.pattern) {
				schema = (schema as z.ZodString).regex(
					new RegExp(validation.pattern),
					validation.patternMessage || 'Invalid format'
				);
			}
	}

	// Make optional if not required
	if (!isRequired) {
		// For strings, allow empty string or undefined
		if (type === 'text' || type === 'textarea' || type === 'email' || type === 'select') {
			schema = z
				.union([schema, z.literal('')])
				.optional()
				.nullable()
				.transform((val) => (val === '' ? undefined : val));
		} else {
			schema = schema.optional().nullable();
		}
	}

	return schema;
}

/**
 * Creates a Zod schema for validating grid row values
 */
export function createGridRowSchema(
	grid: GridDefinition,
	columnStates?: Map<string, ComputedFieldState>
): z.ZodObject<Record<string, ZodTypeAny>> {
	const shape: Record<string, ZodTypeAny> = {};

	for (const column of grid.columns) {
		const columnState = columnStates?.get(column.id);
		shape[column.name] = createFieldValueSchema(column, columnState);
	}

	return z.object(shape);
}

/**
 * Creates a Zod schema for validating an entire grid
 */
export function createGridSchema(
	grid: GridDefinition,
	columnStates?: Map<string, ComputedFieldState>
): ZodTypeAny {
	const rowSchema = createGridRowSchema(grid, columnStates);

	let gridSchema = z.array(rowSchema);

	if (grid.validation.minRows > 0) {
		gridSchema = gridSchema.min(grid.validation.minRows, `At least ${grid.validation.minRows} rows required`);
	}
	if (grid.validation.maxRows !== undefined) {
		gridSchema = gridSchema.max(grid.validation.maxRows, `At most ${grid.validation.maxRows} rows allowed`);
	}

	return gridSchema;
}

/**
 * Creates a Zod schema for validating a complete document form
 */
export function createDocumentFormSchema(
	fields: FieldDefinition[],
	grids: GridDefinition[],
	fieldStates?: Map<string, ComputedFieldState>,
	gridColumnStates?: Map<string, Map<string, ComputedFieldState>>
): z.ZodObject<Record<string, ZodTypeAny>> {
	const shape: Record<string, ZodTypeAny> = {};

	// Add field schemas
	for (const field of fields) {
		const fieldState = fieldStates?.get(field.id);
		shape[field.name] = createFieldValueSchema(field, fieldState);
	}

	// Add grid schemas (arrays of row objects)
	for (const grid of grids) {
		const columnStates = gridColumnStates?.get(grid.id);
		shape[grid.name] = createGridSchema(grid, columnStates);
	}

	return z.object(shape);
}

/**
 * Validation result interface
 */
export interface FormValidationResult {
	success: boolean;
	data?: Record<string, unknown>;
	errors: Record<string, string>;
}

/**
 * Validates form data against dynamically created schema
 * Works both client-side and server-side
 */
export function validateFormData(
	data: Record<string, unknown>,
	fields: FieldDefinition[],
	grids: GridDefinition[],
	fieldStates?: Map<string, ComputedFieldState>,
	gridColumnStates?: Map<string, Map<string, ComputedFieldState>>
): FormValidationResult {
	const schema = createDocumentFormSchema(fields, grids, fieldStates, gridColumnStates);
	const result = schema.safeParse(data);

	if (result.success) {
		return { success: true, data: result.data, errors: {} };
	}

	// Convert Zod errors to field-keyed error messages
	const errors: Record<string, string> = {};
	for (const issue of result.error.issues) {
		const path = issue.path.join('.');
		// Only keep the first error for each field
		if (!errors[path]) {
			errors[path] = issue.message;
		}
	}

	return { success: false, errors };
}

/**
 * Validates a single field value
 */
export function validateFieldValue(
	field: FieldDefinition,
	value: unknown,
	computedState?: ComputedFieldState
): string | null {
	const schema = createFieldValueSchema(field, computedState);
	const result = schema.safeParse(value);

	if (result.success) {
		return null;
	}

	return result.error.issues[0]?.message || 'Invalid value';
}

/**
 * Validates a grid's data
 */
export function validateGridData(
	grid: GridDefinition,
	rows: Record<string, unknown>[],
	columnStates?: Map<string, ComputedFieldState>
): { success: boolean; errors: Array<{ rowIndex: number; field: string; message: string }> } {
	const schema = createGridSchema(grid, columnStates);
	const result = schema.safeParse(rows);

	if (result.success) {
		return { success: true, errors: [] };
	}

	const errors: Array<{ rowIndex: number; field: string; message: string }> = [];
	for (const issue of result.error.issues) {
		const [rowIndex, field] = issue.path;
		if (typeof rowIndex === 'number' && typeof field === 'string') {
			errors.push({
				rowIndex,
				field,
				message: issue.message
			});
		} else if (issue.path.length === 0) {
			// Grid-level error (min/max rows)
			errors.push({
				rowIndex: -1,
				field: '',
				message: issue.message
			});
		}
	}

	return { success: false, errors };
}

/**
 * Sanitizes a string value to prevent XSS
 */
export function sanitizeInput(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#x27;');
}

/**
 * Creates a validation schema from field definitions for server-side use
 */
export function createServerSchema(
	fields: FieldDefinition[],
	grids: GridDefinition[]
): z.ZodObject<Record<string, ZodTypeAny>> {
	return createDocumentFormSchema(fields, grids);
}
