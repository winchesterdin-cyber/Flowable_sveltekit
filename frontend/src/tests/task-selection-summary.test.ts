import { describe, expect, it } from 'vitest';
import type { Task } from '$lib/types';
import { buildTaskSelectionSummary } from '$lib/utils/task-selection-summary';

const baseTask: Omit<Task, 'id' | 'name'> = {
  description: 'Example',
  assignee: 'admin',
  createTime: '2024-01-14T10:00:00Z',
  priority: 50,
  processInstanceId: 'process-1',
  processDefinitionId: 'definition-1',
  taskDefinitionKey: 'task-key'
};

describe('buildTaskSelectionSummary', () => {
  it('returns a helpful message when no tasks are selected', () => {
    const summary = buildTaskSelectionSummary([]);
    expect(summary).toContain('No tasks selected');
  });

  it('summarizes selected task metrics for sharing', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    const tasks: Task[] = [
      {
        ...baseTask,
        id: 'task-1',
        name: 'Overdue task',
        dueDate: '2020-01-01T00:00:00Z',
        priority: 80
      },
      {
        ...baseTask,
        id: 'task-2',
        name: 'Due today',
        dueDate: now.toISOString(),
        assignee: undefined,
        priority: 60
      },
      {
        ...baseTask,
        id: 'task-3',
        name: 'Due soon',
        dueDate: new Date('2024-01-16T09:00:00Z').toISOString(),
        priority: 40
      }
    ];

    const summary = buildTaskSelectionSummary(tasks, now);

    expect(summary).toContain('Selected tasks: 3');
    expect(summary).toContain('Due range: 2020-01-01 → 2024-01-16');
    expect(summary).toContain('Unassigned: 1');
    expect(summary).toContain('Overdue: 1');
    expect(summary).toContain('Due today: 1');
    expect(summary).toContain('Due soon (48h): 1');
    expect(summary).toContain('High priority: 1');
  });
});
