import type { Task } from '$lib/types';
import { formatISODate } from '$lib/utils/form-helpers';
import { buildTaskInsightMetrics } from './task-insights';

/**
 * Build a deterministic due-date range label for selected tasks.
 * We use ISO dates to avoid timezone drift in shared summaries.
 */
export function getDueDateRangeLabel(tasks: Task[]): string {
  const dueDates = tasks
    .map((task) => task.dueDate)
    .filter((dueDate): dueDate is string => Boolean(dueDate))
    .map((dueDate) => new Date(dueDate))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dueDates.length === 0) {
    return 'Due range: No due dates';
  }

  const earliest = formatISODate(dueDates[0]);
  const latest = formatISODate(dueDates[dueDates.length - 1]);

  if (earliest === latest) {
    return `Due range: ${earliest}`;
  }

  return `Due range: ${earliest} → ${latest}`;
}

/**
 * Build a shareable summary for a set of selected tasks.
 * This keeps the clipboard output consistent with the insights panel
 * so users can hand off selections without manual counting.
 */
export function buildTaskSelectionSummary(tasks: Task[], now: Date = new Date()): string {
  const metrics = buildTaskInsightMetrics(tasks, now);

  if (metrics.total === 0) {
    return 'No tasks selected. Select at least one task to generate a selection summary.';
  }

  return [
    `Selected tasks: ${metrics.total}`,
    getDueDateRangeLabel(tasks),
    `Unassigned: ${metrics.unassigned}`,
    `Overdue: ${metrics.overdue}`,
    `Due today: ${metrics.dueToday}`,
    `Due soon (48h): ${metrics.dueSoon}`,
    `High priority: ${metrics.highPriority}`
  ].join('\n');
}
