import { addDays, isBefore, isPast, isToday } from 'date-fns';
import type { Task } from '$lib/types';

export type DueStatus = 'overdue' | 'today' | 'soon' | 'future' | null;
export type InsightFilter =
  | 'all'
  | 'overdue'
  | 'dueToday'
  | 'dueSoon'
  | 'unassigned'
  | 'highPriority';

export interface TaskInsightMetrics {
  total: number;
  unassigned: number;
  overdue: number;
  dueToday: number;
  dueSoon: number;
  highPriority: number;
}

const HIGH_PRIORITY_THRESHOLD = 75;

/**
 * Classify a due date into a status bucket. This keeps the UI consistent
 * anywhere we show due state (cards, summaries, insights) and avoids
 * subtle off-by-one-day mismatches between components.
 */
export function getDueDateStatus(dueDate: string | undefined, now: Date = new Date()): DueStatus {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  if (isPast(date) && !isToday(date)) return 'overdue';
  if (isToday(date)) return 'today';
  if (isBefore(date, addDays(now, 2))) return 'soon';
  return 'future';
}

/**
 * Build aggregate metrics that drive the task insights panel.
 * We intentionally keep this derived from the task list instead of the API
 * so that the insights always reflect whatever filters are currently applied.
 */
export function buildTaskInsightMetrics(tasks: Task[], now: Date = new Date()): TaskInsightMetrics {
  return tasks.reduce<TaskInsightMetrics>(
    (acc, task) => {
      acc.total += 1;
      if (!task.assignee) acc.unassigned += 1;
      if (task.priority >= HIGH_PRIORITY_THRESHOLD) acc.highPriority += 1;

      const dueStatus = getDueDateStatus(task.dueDate, now);
      if (dueStatus === 'overdue') acc.overdue += 1;
      if (dueStatus === 'today') acc.dueToday += 1;
      if (dueStatus === 'soon') acc.dueSoon += 1;

      return acc;
    },
    {
      total: 0,
      unassigned: 0,
      overdue: 0,
      dueToday: 0,
      dueSoon: 0,
      highPriority: 0
    }
  );
}

/**
 * Apply the active insight filter to the already-fetched tasks.
 * This is intentionally client-side so we can filter by due status
 * without needing new backend endpoints.
 */
export function filterTasksByInsight(
  tasks: Task[],
  insight: InsightFilter,
  now: Date = new Date()
): Task[] {
  if (insight === 'all') return tasks;

  return tasks.filter((task) => {
    switch (insight) {
      case 'unassigned':
        return !task.assignee;
      case 'highPriority':
        return task.priority >= HIGH_PRIORITY_THRESHOLD;
      case 'overdue':
        return getDueDateStatus(task.dueDate, now) === 'overdue';
      case 'dueToday':
        return getDueDateStatus(task.dueDate, now) === 'today';
      case 'dueSoon':
        return getDueDateStatus(task.dueDate, now) === 'soon';
      default:
        return true;
    }
  });
}
