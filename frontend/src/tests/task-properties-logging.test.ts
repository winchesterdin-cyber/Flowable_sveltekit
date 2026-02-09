import { render, fireEvent, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import TaskProperties from '$lib/components/TaskProperties.svelte';
import type { Task } from '$lib/types';
import { api } from '$lib/api/client';

vi.mock('$lib/api/client', () => ({
  api: {
    updateTask: vi.fn().mockResolvedValue({})
  }
}));

describe('TaskProperties logging', () => {
  it('emits an event log when task properties are saved', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const task: Task = {
      id: 'task-1',
      name: 'Test Task',
      createTime: new Date().toISOString(),
      priority: 50,
      processInstanceId: 'proc-1',
      processDefinitionId: 'def-1',
      taskDefinitionKey: 'task-key'
    };

    render(TaskProperties, { task, onUpdate: vi.fn() });

    await fireEvent.click(screen.getByTitle('Edit Properties'));
    await fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(api.updateTask).toHaveBeenCalled();
    expect(
      infoSpy.mock.calls.some((call) => String(call[0]).includes('event:task-properties-saved'))
    ).toBe(true);

    infoSpy.mockRestore();
  });
});
