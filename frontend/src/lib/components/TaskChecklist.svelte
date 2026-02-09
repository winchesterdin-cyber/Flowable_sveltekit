<script lang="ts">
	import { onMount } from 'svelte';
	import { createLogger } from '$lib/utils/logger';

	interface Props {
		taskId: string;
		taskName?: string;
	}

	type ChecklistItem = {
		id: string;
		text: string;
		completed: boolean;
		createdAt: string;
	};

	const { taskId, taskName }: Props = $props();

	const logger = createLogger('TaskChecklist');
	const storagePrefix = 'task-checklist';

	let items = $state<ChecklistItem[]>([]);
	let newItemText = $state('');
	let statusMessage = $state('');
	let statusTone = $state<'info' | 'warn' | 'error'>('info');

	const completedCount = $derived(items.filter((item) => item.completed).length);
	const remainingCount = $derived(items.length - completedCount);

	onMount(() => {
		loadChecklist();
	});

	function getStorageKey(id: string) {
		return `${storagePrefix}:${id}`;
	}

	/**
	 * Persist checklist items in localStorage so the checklist stays private to the user.
	 * We intentionally avoid server writes to keep workflow data unchanged.
	 */
	function saveChecklist(nextItems: ChecklistItem[]) {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(getStorageKey(taskId), JSON.stringify(nextItems));
		} catch (error) {
			statusMessage = 'Unable to save checklist updates.';
			statusTone = 'error';
			logger.error('Failed to save checklist', error, { taskId });
		}
	}

	/**
	 * Load checklist items for this task, sanitizing stored data to avoid UI crashes.
	 */
	function loadChecklist() {
		if (typeof window === 'undefined') return;
		try {
			const stored = localStorage.getItem(getStorageKey(taskId));
			if (!stored) {
				logger.info('No checklist stored for task', { taskId, taskName });
				return;
			}
			const parsed = JSON.parse(stored) as ChecklistItem[];
			if (!Array.isArray(parsed)) {
				logger.warn('Checklist storage was not an array, resetting', { taskId });
				return;
			}
			items = parsed.filter((item) => item && typeof item.text === 'string');
			logger.info('Loaded checklist for task', { taskId, count: items.length });
		} catch (error) {
			statusMessage = 'Unable to load checklist items.';
			statusTone = 'error';
			logger.error('Failed to load checklist', error, { taskId });
		}
	}

	function createItemId() {
		if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
			return crypto.randomUUID();
		}
		return `task-${taskId}-${Date.now()}`;
	}

	function handleAddItem() {
		const trimmed = newItemText.trim();
		if (!trimmed) {
			statusMessage = 'Enter a checklist item before adding.';
			statusTone = 'warn';
			logger.warn('Checklist add skipped due to empty input', { taskId });
			return;
		}

		const nextItems = [
			...items,
			{ id: createItemId(), text: trimmed, completed: false, createdAt: new Date().toISOString() }
		];
		items = nextItems;
		newItemText = '';
		statusMessage = 'Checklist item added.';
		statusTone = 'info';
		saveChecklist(nextItems);
		logger.info('Checklist item added', { taskId, count: nextItems.length });
	}

	function toggleItem(itemId: string) {
		const nextItems = items.map((item) =>
			item.id === itemId ? { ...item, completed: !item.completed } : item
		);
		items = nextItems;
		saveChecklist(nextItems);
		logger.info('Checklist item toggled', { taskId, itemId });
	}

	function removeItem(itemId: string) {
		const nextItems = items.filter((item) => item.id !== itemId);
		items = nextItems;
		saveChecklist(nextItems);
		statusMessage = 'Checklist item removed.';
		statusTone = 'info';
		logger.info('Checklist item removed', { taskId, itemId });
	}

	function clearCompleted() {
		if (completedCount === 0) {
			statusMessage = 'No completed items to clear.';
			statusTone = 'warn';
			logger.warn('Checklist clear skipped because no items were completed', { taskId });
			return;
		}
		const nextItems = items.filter((item) => !item.completed);
		items = nextItems;
		saveChecklist(nextItems);
		statusMessage = 'Completed checklist items cleared.';
		statusTone = 'info';
		logger.info('Checklist completed items cleared', { taskId, remaining: nextItems.length });
	}
</script>

<div class="card dark:bg-gray-800 dark:border-gray-700">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Checklist</h2>
			<p class="text-sm text-gray-600 dark:text-gray-400">
				Track personal follow-ups for this task without changing workflow data.
			</p>
		</div>
		<div class="text-right text-xs text-gray-500 dark:text-gray-400">
			<p>{remainingCount} remaining</p>
			<p>{completedCount} completed</p>
		</div>
	</div>

	<div class="mt-4 space-y-4">
		<div class="flex flex-col sm:flex-row gap-2">
			<label class="sr-only" for="checklist-item">Add checklist item</label>
			<input
				id="checklist-item"
				type="text"
				bind:value={newItemText}
				class="input flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
				placeholder="Add a follow-up item..."
				onkeydown={(event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						handleAddItem();
					}
				}}
			/>
			<button type="button" class="btn btn-primary" onclick={handleAddItem}>
				Add Item
			</button>
		</div>

		{#if items.length === 0}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				No checklist items yet. Add one to track your next steps.
			</p>
		{:else}
			<ul class="space-y-2">
				{#each items as item (item.id)}
					<li class="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
						<input
							type="checkbox"
							class="mt-1 h-4 w-4 text-blue-600"
							checked={item.completed}
							onclick={() => toggleItem(item.id)}
							aria-label={`Mark ${item.text} as complete`}
						/>
						<div class="flex-1">
							<p class={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
								{item.text}
							</p>
							<p class="text-xs text-gray-400">Added {new Date(item.createdAt).toLocaleDateString()}</p>
						</div>
						<button
							type="button"
							class="text-xs text-red-600 hover:text-red-700"
							onclick={() => removeItem(item.id)}
						>
							Remove
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="flex flex-wrap items-center gap-3">
			<button
				type="button"
				class="btn btn-secondary"
				onclick={clearCompleted}
				disabled={completedCount === 0}
			>
				Clear Completed
			</button>
			{#if statusMessage}
				<span
					class={`text-sm ${
						statusTone === 'error'
							? 'text-red-600 dark:text-red-400'
							: statusTone === 'warn'
								? 'text-amber-600 dark:text-amber-400'
								: 'text-green-600 dark:text-green-400'
					}`}
				>
					{statusMessage}
				</span>
			{/if}
		</div>
	</div>
</div>
