import { render, fireEvent, screen } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import TaskChecklist from '$lib/components/TaskChecklist.svelte';

describe('TaskChecklist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds checklist items and persists them locally', async () => {
    render(TaskChecklist, { taskId: 'task-1', taskName: 'Test Task' });

    const input = screen.getByPlaceholderText('Add a follow-up item...');
    await fireEvent.input(input, { target: { value: 'Call vendor' } });

    const addButton = screen.getByRole('button', { name: 'Add Item' });
    await fireEvent.click(addButton);

    expect(screen.getByText('Call vendor')).toBeInTheDocument();

    const stored = localStorage.getItem('task-checklist:task-1');
    expect(stored).toContain('Call vendor');
  });

  it('toggles checklist completion and clears completed items', async () => {
    render(TaskChecklist, { taskId: 'task-2' });

    const input = screen.getByPlaceholderText('Add a follow-up item...');
    await fireEvent.input(input, { target: { value: 'Review invoice' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));

    const checkbox = screen.getByRole('checkbox', { name: 'Mark Review invoice as complete' });
    await fireEvent.click(checkbox);

    expect(screen.getByText('1 completed')).toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: 'Clear Completed' });
    await fireEvent.click(clearButton);

    expect(screen.queryByText('Review invoice')).not.toBeInTheDocument();
  });
});
