/**
 * Condition State Computer
 *
 * Computes the visibility and readonly state of fields, grids, and columns
 * based on condition rules. Implements "least access wins" logic.
 */

import type {
  FieldConditionRule,
  ComputedFieldState,
  ComputedGridState,
  FormField,
  FormGrid,
  GridColumn,
  ConditionTarget
} from '$lib/types';
import { ExpressionEvaluator, type EvaluationContext } from './expression-evaluator';
import { createLogger } from './logger';

const log = createLogger('ConditionStateComputer');

interface AccessState {
  isHidden: boolean;
  isReadonly: boolean;
  hiddenLocked: boolean;
  readonlyLocked: boolean;
}

/**
 * Result of computing all field and grid states
 */
export interface ComputedFormState {
  fields: Record<string, ComputedFieldState>;
  grids: Record<string, ComputedGridState>;
}

/**
 * Options for the state computer
 */
export interface StateComputerOptions {
  /** Base readonly state (e.g., form-level readonly) */
  formReadonly?: boolean;
}

/**
 * Computes field and grid states based on condition rules
 */
export class ConditionStateComputer {
  private evaluator: ExpressionEvaluator;
  private options: StateComputerOptions;

  constructor(context: EvaluationContext, options: StateComputerOptions = {}) {
    this.evaluator = new ExpressionEvaluator(context);
    this.options = options;
  }

  /**
   * Update the evaluation context (e.g., when form values change)
   */
  updateContext(context: Partial<EvaluationContext>): void {
    this.evaluator.updateContext(context);
  }

  /**
   * Compute the state of all fields and grids based on condition rules
   */
  computeFormState(
    fields: FormField[] = [],
    grids: FormGrid[] = [],
    globalRules: FieldConditionRule[] = [],
    taskRules: FieldConditionRule[] = []
  ): ComputedFormState {
    // Combine and sort rules by priority (higher first)
    const allRules = [...globalRules, ...taskRules]
      .filter((rule) => rule.enabled)
      .sort((a, b) => {
        const priorityDiff = b.priority - a.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return a.id.localeCompare(b.id);
      });

    const fieldStates: Record<string, ComputedFieldState> = {};
    const gridStates: Record<string, ComputedGridState> = {};

    // Compute field states
    for (const field of fields) {
      fieldStates[field.name] = this.computeFieldState(field, allRules);
    }

    // Compute grid states
    for (const grid of grids) {
      gridStates[grid.name] = this.computeGridState(grid, allRules);
    }

    return { fields: fieldStates, grids: gridStates };
  }

  /**
   * Compute the state of a single field
   */
  computeFieldState(field: FormField, rules: FieldConditionRule[]): ComputedFieldState {
    // Start with field's static properties
    const state: AccessState = {
      isHidden: !!field.hidden,
      isReadonly: field.readonly || this.options.formReadonly || false,
      hiddenLocked: false,
      readonlyLocked: false
    };
    const appliedRules: string[] = [];

    // Evaluate field-level expressions first (backward compatibility)
    if (field.hiddenExpression) {
      const result = this.evaluator.evaluateBoolean(field.hiddenExpression);
      if (result) {
        state.isHidden = true;
        state.hiddenLocked = true;
        appliedRules.push('field:hiddenExpression');
      }
    }
    if (field.readonlyExpression) {
      const result = this.evaluator.evaluateBoolean(field.readonlyExpression);
      if (result) {
        state.isReadonly = true;
        state.readonlyLocked = true;
        appliedRules.push('field:readonlyExpression');
      }
    }

    // Apply condition rules - LEAST ACCESS WINS
    for (const rule of rules) {
      if (!this.ruleAppliesToField(rule.target, field.name)) continue;

      const conditionMet = this.evaluator.evaluateBoolean(rule.condition);
      if (!conditionMet) continue;

      appliedRules.push(rule.id);

      this.applyRuleEffect(state, rule.effect, !!this.options.formReadonly);
    }

    return { isHidden: state.isHidden, isReadonly: state.isReadonly, appliedRules };
  }

  /**
   * Compute the state of a grid and its columns
   */
  computeGridState(grid: FormGrid, rules: FieldConditionRule[]): ComputedGridState {
    // Start with grid's static properties (grids don't have hidden/readonly by default)
    const state: AccessState = {
      isHidden: false,
      isReadonly: this.options.formReadonly || false,
      hiddenLocked: false,
      readonlyLocked: false
    };
    const appliedRules: string[] = [];
    const columnStates: Record<string, ComputedFieldState> = {};

    // Apply condition rules to grid - LEAST ACCESS WINS
    for (const rule of rules) {
      if (!this.ruleAppliesToGrid(rule.target, grid.name)) continue;

      const conditionMet = this.evaluator.evaluateBoolean(rule.condition);
      if (!conditionMet) continue;

      appliedRules.push(rule.id);

      this.applyRuleEffect(state, rule.effect, this.options.formReadonly || false);
    }

    // Compute individual column states
    for (const column of grid.columns) {
      columnStates[column.name] = this.computeColumnState(
        grid.name,
        column,
        rules,
        state.isReadonly
      );
    }

    return { isHidden: state.isHidden, isReadonly: state.isReadonly, columnStates, appliedRules };
  }

  /**
   * Compute the state of a single column within a grid
   */
  computeColumnState(
    gridName: string,
    column: GridColumn,
    rules: FieldConditionRule[],
    gridReadonly: boolean
  ): ComputedFieldState {
    const state: AccessState = {
      isHidden: false,
      isReadonly: gridReadonly,
      hiddenLocked: false,
      readonlyLocked: false
    };
    const appliedRules: string[] = [];

    // Apply condition rules to column - LEAST ACCESS WINS
    for (const rule of rules) {
      if (!this.ruleAppliesToColumn(rule.target, gridName, column.name)) continue;

      const conditionMet = this.evaluator.evaluateBoolean(rule.condition);
      if (!conditionMet) continue;

      appliedRules.push(rule.id);

      this.applyRuleEffect(state, rule.effect, gridReadonly);
    }

    return { isHidden: state.isHidden, isReadonly: state.isReadonly, appliedRules };
  }

  private applyRuleEffect(
    state: AccessState,
    effect: FieldConditionRule['effect'],
    readonlyFallback: boolean
  ): void {
    switch (effect) {
      case 'hidden':
        state.isHidden = true;
        state.hiddenLocked = true;
        return;
      case 'readonly':
        state.isReadonly = true;
        state.readonlyLocked = true;
        return;
      case 'visible':
        if (!state.hiddenLocked) {
          state.isHidden = false;
        }
        return;
      case 'editable':
        if (!state.readonlyLocked) {
          state.isReadonly = readonlyFallback;
        }
        return;
      default:
        log.warn('Ignoring unsupported rule effect', { effect });
    }
  }

  /**
   * Check if a rule applies to a specific field
   */
  private ruleAppliesToField(target: ConditionTarget, fieldName: string): boolean {
    switch (target.type) {
      case 'all':
        return true;
      case 'field':
        return target.fieldNames?.includes(fieldName) || false;
      default:
        if (target.type === 'column' || target.type === 'grid') {
          return false;
        }
        log.warn('Unexpected target type while checking field applicability', {
          targetType: target
        });
        return false;
    }
  }

  /**
   * Check if a rule applies to a specific grid
   */
  private ruleAppliesToGrid(target: ConditionTarget, gridName: string): boolean {
    switch (target.type) {
      case 'all':
        return true;
      case 'grid':
        return target.gridNames?.includes(gridName) || false;
      default:
        if (target.type === 'column' || target.type === 'field') {
          return false;
        }
        log.warn('Unexpected target type while checking grid applicability', {
          targetType: target
        });
        return false;
    }
  }

  /**
   * Check if a rule applies to a specific column in a grid
   */
  private ruleAppliesToColumn(
    target: ConditionTarget,
    gridName: string,
    columnName: string
  ): boolean {
    if (target.type === 'all') return true;
    if (target.type === 'grid' && target.gridNames?.includes(gridName)) return true;
    if (target.type === 'column' && target.columnTargets) {
      const gridTarget = target.columnTargets.find((ct) => ct.gridName === gridName);
      if (gridTarget && gridTarget.columnNames.includes(columnName)) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Create a state computer with the given context
 */
export function createStateComputer(
  context: EvaluationContext,
  options: StateComputerOptions = {}
): ConditionStateComputer {
  return new ConditionStateComputer(context, options);
}

/**
 * Helper to merge a field with its computed state
 */
export function applyFieldState(
  field: FormField,
  state: ComputedFieldState
): FormField & { computedHidden: boolean; computedReadonly: boolean } {
  return {
    ...field,
    computedHidden: state.isHidden,
    computedReadonly: state.isReadonly
  };
}

/**
 * Helper to generate a unique rule ID
 */
export function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a default condition rule
 */
export function createDefaultRule(partial: Partial<FieldConditionRule> = {}): FieldConditionRule {
  return {
    id: generateRuleId(),
    name: 'New Rule',
    description: '',
    condition: '',
    effect: 'readonly',
    target: { type: 'all' },
    priority: 0,
    enabled: true,
    ...partial
  };
}
