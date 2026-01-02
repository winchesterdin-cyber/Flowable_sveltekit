# Process Data Separation Implementation Plan

## Overview

This plan describes the architecture for separating process data into distinct layers:
- **Process Variables** (Flowable engine) - workflow state and routing logic
- **Documents** (Business data) - user-entered form data, one per type per process
- **Grids** (Tabular data) - multiple grids per document, one row per record

## Data Model

### Conceptual Hierarchy

```
Process Instance
└── Documents (1:N, one per type)
    ├── type: "main" | "contract" | "invoice" | "custom_type"
    ├── fields (30 varchar, 30 float, 30 datetime)
    └── Grids (1:N per document)
        ├── grid_name: "items" | "participants" | etc.
        └── Grid Rows (1:N per grid)
            └── fields (30 varchar, 30 float, 30 datetime)
```

### Database Schema Changes

#### 1. Documents Table (Modified)

```sql
-- PostgreSQL
CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,

    -- Process linking
    process_instance_id VARCHAR(255) NOT NULL,
    business_key VARCHAR(255),
    process_definition_key VARCHAR(255),
    process_definition_name VARCHAR(255),

    -- Document type (NEW)
    type VARCHAR(100) NOT NULL DEFAULT 'main',

    -- Data columns (existing)
    varchar_1 VARCHAR(4000), varchar_2 VARCHAR(4000), ... varchar_30 VARCHAR(4000),
    float_1 DOUBLE PRECISION, float_2 DOUBLE PRECISION, ... float_30 DOUBLE PRECISION,
    datetime_1 TIMESTAMP, datetime_2 TIMESTAMP, ... datetime_30 TIMESTAMP,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    -- Unique constraint: one document per type per process
    CONSTRAINT uk_process_type UNIQUE (process_instance_id, type)
);

CREATE INDEX idx_documents_process_id ON documents(process_instance_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_business_key ON documents(business_key);
```

#### 2. Grid Rows Table (Existing structure maintained)

```sql
CREATE TABLE grid_rows (
    id BIGSERIAL PRIMARY KEY,

    -- Document linking (existing)
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Grid identification
    grid_name VARCHAR(255) NOT NULL,
    row_index INTEGER NOT NULL,

    -- Data columns (same as documents)
    varchar_1 VARCHAR(4000), ... varchar_30 VARCHAR(4000),
    float_1 DOUBLE PRECISION, ... float_30 DOUBLE PRECISION,
    datetime_1 TIMESTAMP, ... datetime_30 TIMESTAMP,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- One row per index per grid per document
    CONSTRAINT uk_grid_row UNIQUE (document_id, grid_name, row_index)
);

CREATE INDEX idx_grid_rows_document_id ON grid_rows(document_id);
CREATE INDEX idx_grid_rows_grid_name ON grid_rows(grid_name);
```

#### 3. Column Mapping Table (Modified)

```sql
CREATE TABLE column_mapping (
    id BIGSERIAL PRIMARY KEY,

    -- Scope identification
    scope_type VARCHAR(20) NOT NULL, -- 'DOCUMENT' or 'GRID'
    process_definition_key VARCHAR(255) NOT NULL,
    document_type VARCHAR(100), -- NEW: for document-specific mappings
    grid_name VARCHAR(255),     -- For grid scope

    -- Field mapping
    field_name VARCHAR(255) NOT NULL,
    field_type VARCHAR(20) NOT NULL, -- 'VARCHAR', 'FLOAT', 'DATETIME'
    column_name VARCHAR(50) NOT NULL,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Unique mapping per field per scope
    CONSTRAINT uk_field_mapping UNIQUE (scope_type, process_definition_key, document_type, grid_name, field_name)
);
```

---

## Validation Architecture with Zod

### Philosophy

All fields and grids are **visible by default**. Visibility, readonly, and required states are declared using Zod schemas that work both client-side and server-side.

### Zod Schema Structure

```typescript
// frontend/src/lib/validation/schemas.ts

import { z } from 'zod';

// Base field validation schema
export const fieldValidationSchema = z.object({
  // Field is visible by default (true)
  visible: z.boolean().default(true),

  // Field is editable by default (readonly = false)
  readonly: z.boolean().default(false),

  // Field is optional by default (required = false)
  required: z.boolean().default(false),

  // Value constraints
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
});

export type FieldValidation = z.infer<typeof fieldValidationSchema>;

// Field definition with validation
export const fieldDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  type: z.enum(['text', 'number', 'email', 'date', 'datetime', 'checkbox', 'select', 'textarea']),

  // Validation rules (visible, readonly, required + constraints)
  validation: fieldValidationSchema.default({
    visible: true,
    readonly: false,
    required: false,
  }),

  // Options for select fields
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
  })).optional(),

  // Default value
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),

  // Conditional expressions (evaluated at runtime)
  visibleWhen: z.string().optional(),    // e.g., "${amount > 1000}"
  readonlyWhen: z.string().optional(),   // e.g., "${status == 'approved'}"
  requiredWhen: z.string().optional(),   // e.g., "${category == 'premium'}"
});

export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;

// Grid definition with validation
export const gridDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),

  // Grid-level validation
  validation: z.object({
    visible: z.boolean().default(true),
    readonly: z.boolean().default(false),
    minRows: z.number().default(0),
    maxRows: z.number().optional(),
  }).default({
    visible: true,
    readonly: false,
    minRows: 0,
  }),

  // Column definitions
  columns: z.array(fieldDefinitionSchema),

  // Conditional expressions
  visibleWhen: z.string().optional(),
  readonlyWhen: z.string().optional(),
});

export type GridDefinition = z.infer<typeof gridDefinitionSchema>;

// Document type definition
export const documentTypeSchema = z.object({
  type: z.string(),
  label: z.string(),
  description: z.string().optional(),

  // Fields in this document type
  fields: z.array(fieldDefinitionSchema),

  // Grids in this document type
  grids: z.array(gridDefinitionSchema),
});

export type DocumentType = z.infer<typeof documentTypeSchema>;

// Process form configuration
export const processFormConfigSchema = z.object({
  processDefinitionKey: z.string(),

  // Document types available for this process
  documentTypes: z.array(documentTypeSchema),

  // Global condition rules
  conditionRules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    condition: z.string(),
    effect: z.enum(['hidden', 'visible', 'readonly', 'editable', 'required', 'optional']),
    target: z.object({
      type: z.enum(['all', 'document', 'field', 'grid', 'column']),
      documentType: z.string().optional(),
      fieldId: z.string().optional(),
      gridId: z.string().optional(),
      columnId: z.string().optional(),
    }),
    priority: z.number().default(0),
    enabled: z.boolean().default(true),
  })),
});

export type ProcessFormConfig = z.infer<typeof processFormConfigSchema>;
```

### Dynamic Value Validation

```typescript
// frontend/src/lib/validation/dynamic-validator.ts

import { z } from 'zod';
import type { FieldDefinition, GridDefinition } from './schemas';

/**
 * Creates a Zod schema for validating field values based on field definition
 */
export function createFieldValueSchema(field: FieldDefinition): z.ZodTypeAny {
  const { validation, type } = field;

  let schema: z.ZodTypeAny;

  // Base type schema
  switch (type) {
    case 'number':
      schema = z.coerce.number();
      if (validation.min !== undefined) {
        schema = (schema as z.ZodNumber).min(validation.min);
      }
      if (validation.max !== undefined) {
        schema = (schema as z.ZodNumber).max(validation.max);
      }
      break;

    case 'email':
      schema = z.string().email();
      break;

    case 'date':
    case 'datetime':
      schema = z.coerce.date();
      break;

    case 'checkbox':
      schema = z.boolean();
      break;

    default: // text, textarea, select
      schema = z.string();
      if (validation.minLength !== undefined) {
        schema = (schema as z.ZodString).min(validation.minLength);
      }
      if (validation.maxLength !== undefined) {
        schema = (schema as z.ZodString).max(validation.maxLength);
      }
      if (validation.pattern) {
        schema = (schema as z.ZodString).regex(
          new RegExp(validation.pattern),
          validation.patternMessage || 'Invalid format'
        );
      }
  }

  // Make optional if not required
  if (!validation.required) {
    schema = schema.optional().nullable();
  }

  return schema;
}

/**
 * Creates a Zod schema for validating a document's form values
 */
export function createDocumentFormSchema(
  fields: FieldDefinition[],
  grids: GridDefinition[]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  // Add field schemas
  for (const field of fields) {
    shape[field.name] = createFieldValueSchema(field);
  }

  // Add grid schemas (arrays of row objects)
  for (const grid of grids) {
    const rowShape: Record<string, z.ZodTypeAny> = {};
    for (const column of grid.columns) {
      rowShape[column.name] = createFieldValueSchema(column);
    }

    let gridSchema = z.array(z.object(rowShape));

    if (grid.validation.minRows > 0) {
      gridSchema = gridSchema.min(grid.validation.minRows);
    }
    if (grid.validation.maxRows !== undefined) {
      gridSchema = gridSchema.max(grid.validation.maxRows);
    }

    shape[grid.name] = gridSchema;
  }

  return z.object(shape);
}

/**
 * Validates form data against a dynamic schema
 * Works both client-side and server-side
 */
export function validateFormData(
  data: Record<string, unknown>,
  fields: FieldDefinition[],
  grids: GridDefinition[]
): { success: true; data: Record<string, unknown> } | { success: false; errors: Record<string, string> } {
  const schema = createDocumentFormSchema(fields, grids);
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Convert Zod errors to field-keyed error messages
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  }

  return { success: false, errors };
}
```

---

## Backend Changes

### 1. Document Entity Update

```java
// backend/src/main/java/com/demo/bpm/entity/Document.java

@Entity
@Table(name = "documents",
       uniqueConstraints = @UniqueConstraint(columnNames = {"process_instance_id", "type"}))
public class Document {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "process_instance_id", nullable = false)
    private String processInstanceId;

    @Column(name = "business_key")
    private String businessKey;

    @Column(name = "process_definition_key")
    private String processDefinitionKey;

    @Column(name = "process_definition_name")
    private String processDefinitionName;

    // NEW: Document type
    @Column(name = "type", nullable = false)
    private String type = "main";

    // ... existing 90 data columns ...

    // Grid rows relationship
    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GridRow> gridRows = new ArrayList<>();
}
```

### 2. Document DTO Update

```java
// backend/src/main/java/com/demo/bpm/dto/DocumentDTO.java

public class DocumentDTO {
    private Long id;
    private String processInstanceId;
    private String businessKey;
    private String processDefinitionKey;
    private String processDefinitionName;
    private String type; // NEW
    private Map<String, Object> fields;
    private Map<String, List<Map<String, Object>>> grids;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
}
```

### 3. Repository Updates

```java
// backend/src/main/java/com/demo/bpm/repository/DocumentRepository.java

public interface DocumentRepository extends JpaRepository<Document, Long> {

    // Find all documents for a process
    List<Document> findByProcessInstanceId(String processInstanceId);

    // Find specific document by type
    Optional<Document> findByProcessInstanceIdAndType(String processInstanceId, String type);

    // Find by business key and type
    Optional<Document> findByBusinessKeyAndType(String businessKey, String type);

    // Delete all documents for a process
    void deleteByProcessInstanceId(String processInstanceId);

    // Check if document type exists
    boolean existsByProcessInstanceIdAndType(String processInstanceId, String type);
}
```

### 4. Service Updates

```java
// backend/src/main/java/com/demo/bpm/service/BusinessTableService.java

@Service
public class BusinessTableService {

    /**
     * Save or update a document of a specific type
     */
    public DocumentDTO saveDocument(
            String processInstanceId,
            String businessKey,
            String processDefinitionKey,
            String processDefinitionName,
            String documentType,  // NEW parameter
            Map<String, Object> fields,
            String userId) {
        // ...
    }

    /**
     * Get all documents for a process instance
     */
    public List<DocumentDTO> getDocumentsByProcessInstanceId(String processInstanceId) {
        // Returns list of all document types
    }

    /**
     * Get a specific document by type
     */
    public Optional<DocumentDTO> getDocument(String processInstanceId, String documentType) {
        // Returns specific document type
    }

    /**
     * Save grid rows for a document
     */
    public void saveGridRows(
            String processInstanceId,
            String documentType,
            String gridName,
            List<Map<String, Object>> rows) {
        // Finds document by type, saves grid rows
    }

    /**
     * Get grid rows for a document
     */
    public List<GridRowDTO> getGridRows(
            String processInstanceId,
            String documentType,
            String gridName) {
        // Returns grid rows for specific document type
    }
}
```

### 5. Controller Updates

```java
// backend/src/main/java/com/demo/bpm/controller/BusinessTableController.java

@RestController
@RequestMapping("/api/business")
public class BusinessTableController {

    // Get all documents for a process
    @GetMapping("/processes/{processInstanceId}/documents")
    public List<DocumentDTO> getDocuments(@PathVariable String processInstanceId) {
        return businessTableService.getDocumentsByProcessInstanceId(processInstanceId);
    }

    // Get specific document by type
    @GetMapping("/processes/{processInstanceId}/documents/{type}")
    public DocumentDTO getDocument(
            @PathVariable String processInstanceId,
            @PathVariable String type) {
        return businessTableService.getDocument(processInstanceId, type)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    // Save/update document
    @PostMapping("/processes/{processInstanceId}/documents/{type}")
    public DocumentDTO saveDocument(
            @PathVariable String processInstanceId,
            @PathVariable String type,
            @RequestBody DocumentSaveRequest request) {
        return businessTableService.saveDocument(
            processInstanceId,
            request.getBusinessKey(),
            request.getProcessDefinitionKey(),
            request.getProcessDefinitionName(),
            type,
            request.getFields(),
            getCurrentUserId()
        );
    }

    // Get grids for a document type
    @GetMapping("/processes/{processInstanceId}/documents/{type}/grids/{gridName}")
    public List<GridRowDTO> getGridRows(
            @PathVariable String processInstanceId,
            @PathVariable String type,
            @PathVariable String gridName) {
        return businessTableService.getGridRows(processInstanceId, type, gridName);
    }

    // Save grids for a document type
    @PostMapping("/processes/{processInstanceId}/documents/{type}/grids/{gridName}")
    public void saveGridRows(
            @PathVariable String processInstanceId,
            @PathVariable String type,
            @PathVariable String gridName,
            @RequestBody List<Map<String, Object>> rows) {
        businessTableService.saveGridRows(processInstanceId, type, gridName, rows);
    }
}
```

---

## Frontend Changes

### 1. Install Zod

```bash
cd frontend
npm install zod
```

### 2. API Client Updates

```typescript
// frontend/src/lib/api/client.ts

export const documentApi = {
  // Get all documents for a process
  async getDocuments(processInstanceId: string): Promise<DocumentDTO[]> {
    const response = await fetch(`${API_BASE}/business/processes/${processInstanceId}/documents`);
    return response.json();
  },

  // Get specific document by type
  async getDocument(processInstanceId: string, type: string): Promise<DocumentDTO> {
    const response = await fetch(`${API_BASE}/business/processes/${processInstanceId}/documents/${type}`);
    return response.json();
  },

  // Save document
  async saveDocument(processInstanceId: string, type: string, data: DocumentSaveRequest): Promise<DocumentDTO> {
    const response = await fetch(`${API_BASE}/business/processes/${processInstanceId}/documents/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Get grid rows
  async getGridRows(processInstanceId: string, type: string, gridName: string): Promise<GridRowDTO[]> {
    const response = await fetch(
      `${API_BASE}/business/processes/${processInstanceId}/documents/${type}/grids/${gridName}`
    );
    return response.json();
  },

  // Save grid rows
  async saveGridRows(
    processInstanceId: string,
    type: string,
    gridName: string,
    rows: Record<string, unknown>[]
  ): Promise<void> {
    await fetch(
      `${API_BASE}/business/processes/${processInstanceId}/documents/${type}/grids/${gridName}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      }
    );
  },
};
```

### 3. Form Validation Hook

```typescript
// frontend/src/lib/hooks/useFormValidation.ts

import { z } from 'zod';
import { createDocumentFormSchema, validateFormData } from '$lib/validation/dynamic-validator';
import type { FieldDefinition, GridDefinition } from '$lib/validation/schemas';

/**
 * Svelte 5 runes-based form validation hook
 */
export function useFormValidation(
  fields: FieldDefinition[],
  grids: GridDefinition[]
) {
  let errors = $state<Record<string, string>>({});
  let isValid = $state(true);

  const schema = $derived(createDocumentFormSchema(fields, grids));

  function validate(data: Record<string, unknown>): boolean {
    const result = schema.safeParse(data);

    if (result.success) {
      errors = {};
      isValid = true;
      return true;
    }

    errors = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      errors[path] = issue.message;
    }
    isValid = false;
    return false;
  }

  function validateField(name: string, value: unknown): string | null {
    const field = fields.find(f => f.name === name);
    if (!field) return null;

    const fieldSchema = createFieldValueSchema(field);
    const result = fieldSchema.safeParse(value);

    if (result.success) {
      delete errors[name];
      return null;
    }

    const error = result.error.issues[0]?.message || 'Invalid value';
    errors[name] = error;
    return error;
  }

  function clearErrors() {
    errors = {};
    isValid = true;
  }

  return {
    get errors() { return errors; },
    get isValid() { return isValid; },
    validate,
    validateField,
    clearErrors,
  };
}
```

### 4. Server-Side Validation (SvelteKit Actions)

```typescript
// frontend/src/routes/tasks/[taskId]/+page.server.ts

import { z } from 'zod';
import { validateFormData } from '$lib/validation/dynamic-validator';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  submit: async ({ request, params, fetch }) => {
    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    // Get form configuration from backend
    const configResponse = await fetch(`/api/forms/${params.taskId}/config`);
    const config = await configResponse.json();

    // Validate using Zod (same logic as client-side)
    const result = validateFormData(data, config.fields, config.grids);

    if (!result.success) {
      return fail(400, { errors: result.errors });
    }

    // Save validated data
    const response = await fetch(`/api/tasks/${params.taskId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
    });

    if (!response.ok) {
      return fail(response.status, { error: 'Failed to save' });
    }

    return { success: true };
  },
};
```

---

## Implementation Steps

### Phase 1: Database Schema Migration

1. Create migration script for `documents` table:
   - Add `type` column with default 'main'
   - Update unique constraint to `(process_instance_id, type)`
   - Add index on `type` column

2. Update `column_mapping` table:
   - Add `document_type` column
   - Update unique constraint

### Phase 2: Backend Updates

1. Update `Document.java` entity
2. Update `DocumentDTO.java`
3. Update `DocumentRepository.java`
4. Update `BusinessTableService.java`
5. Update `ColumnMappingService.java`
6. Update `BusinessTableController.java`
7. Add migration for existing data (set type='main' for all)

### Phase 3: Frontend Validation (Zod)

1. Install Zod: `npm install zod`
2. Create `frontend/src/lib/validation/schemas.ts`
3. Create `frontend/src/lib/validation/dynamic-validator.ts`
4. Create `frontend/src/lib/hooks/useFormValidation.ts`
5. Update `DynamicForm.svelte` to use Zod validation
6. Update `DynamicGrid.svelte` to use Zod validation
7. Add server-side validation in SvelteKit actions

### Phase 4: API Updates

1. Update `frontend/src/lib/api/client.ts` with new endpoints
2. Update `frontend/src/lib/types/index.ts` with new types
3. Update form components to handle multiple document types

### Phase 5: Testing & Migration

1. Write unit tests for validation schemas
2. Write integration tests for new endpoints
3. Create data migration script for existing processes
4. Update documentation

---

## Key Principles

1. **Visible by Default**: All fields and grids are visible unless explicitly hidden
2. **Editable by Default**: All fields are editable unless explicitly readonly
3. **Optional by Default**: All fields are optional unless explicitly required
4. **Single Source of Truth**: Zod schemas define validation for both client and server
5. **Separation of Concerns**: Documents store user data, process variables store workflow state
6. **Type Safety**: Full TypeScript types generated from Zod schemas
