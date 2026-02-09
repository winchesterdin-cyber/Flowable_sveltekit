<script lang="ts">
	import { onMount } from 'svelte';
	import { createLogger } from '$lib/utils/logger';

	interface Props {
		taskId: string;
		taskName?: string;
	}

	const { taskId, taskName }: Props = $props();

	type StoredNote = {
		note: string;
		reminderDate?: string;
		updatedAt: string;
	};

	const logger = createLogger('TaskPersonalNotes');
	const storagePrefix = 'task-notes';

	let note = $state('');
	let reminderDate = $state('');
	let lastSavedAt = $state<string | null>(null);
	let savedNote = $state('');
	let savedReminder = $state('');
	let statusMessage = $state('');
	let statusTone = $state<'info' | 'warn' | 'error'>('info');

	const reminderStatus = $derived.by(() => {
		if (!reminderDate) return null;
		const today = new Date();
		const reminder = new Date(reminderDate);
		if (Number.isNaN(reminder.getTime())) {
			return { label: 'Reminder date is invalid.', tone: 'error' };
		}
		const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const startOfReminder = new Date(
			reminder.getFullYear(),
			reminder.getMonth(),
			reminder.getDate()
		);
		const diffDays = Math.round((startOfReminder.getTime() - startOfToday.getTime()) / 86_400_000);

		if (diffDays < 0) return { label: 'Reminder is overdue.', tone: 'warn' };
		if (diffDays === 0) return { label: 'Reminder is due today.', tone: 'info' };
		return { label: `Reminder in ${diffDays} day${diffDays === 1 ? '' : 's'}.`, tone: 'info' };
	});

	const hasUnsavedChanges = $derived(
		note.trim() !== savedNote.trim() || reminderDate !== savedReminder
	);

	onMount(() => {
		loadNotes();
	});

	function getStorageKey(id: string) {
		return `${storagePrefix}:${id}`;
	}

	/**
	 * Load existing notes for the task from localStorage.
	 * Notes are intentionally stored client-side so they do not alter workflow data.
	 */
	function loadNotes() {
		if (typeof window === 'undefined') return;
		try {
			const stored = localStorage.getItem(getStorageKey(taskId));
			if (!stored) {
				logger.info('No personal notes stored for task', { taskId, taskName });
				return;
			}
			const parsed = JSON.parse(stored) as StoredNote;
			note = parsed.note || '';
			reminderDate = parsed.reminderDate || '';
			lastSavedAt = parsed.updatedAt;
			savedNote = note;
			savedReminder = reminderDate;
			logger.info('Loaded personal notes for task', { taskId, hasReminder: Boolean(reminderDate) });
		} catch (error) {
			statusMessage = 'Unable to load saved notes.';
			statusTone = 'error';
			logger.error('Failed to load personal notes', error, { taskId });
		}
	}

	function saveNotes() {
		if (typeof window === 'undefined') return;
		if (!note.trim() && !reminderDate) {
			statusMessage = 'Add a note or reminder before saving.';
			statusTone = 'warn';
			logger.warn('Save skipped because note and reminder were empty', { taskId });
			return;
		}

		try {
			const payload: StoredNote = {
				note: note.trim(),
				reminderDate: reminderDate || undefined,
				updatedAt: new Date().toISOString()
			};
			localStorage.setItem(getStorageKey(taskId), JSON.stringify(payload));
			lastSavedAt = payload.updatedAt;
			savedNote = note;
			savedReminder = reminderDate;
			statusMessage = 'Personal notes saved.';
			statusTone = 'info';
			logger.info('Saved personal notes for task', { taskId, hasReminder: Boolean(reminderDate) });
		} catch (error) {
			statusMessage = 'Unable to save personal notes.';
			statusTone = 'error';
			logger.error('Failed to save personal notes', error, { taskId });
		}
	}

	function clearNotes() {
		if (typeof window === 'undefined') return;
		try {
			localStorage.removeItem(getStorageKey(taskId));
			note = '';
			reminderDate = '';
			lastSavedAt = null;
			savedNote = '';
			savedReminder = '';
			statusMessage = 'Personal notes cleared.';
			statusTone = 'info';
			logger.info('Cleared personal notes for task', { taskId });
		} catch (error) {
			statusMessage = 'Unable to clear notes.';
			statusTone = 'error';
			logger.error('Failed to clear personal notes', error, { taskId });
		}
	}
</script>

<div class="card dark:bg-gray-800 dark:border-gray-700">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Personal Notes</h2>
			<p class="text-sm text-gray-600 dark:text-gray-400">
				Keep private reminders for this task without affecting the workflow.
			</p>
		</div>
		{#if hasUnsavedChanges}
			<span class="text-xs font-medium text-amber-600 dark:text-amber-400">Unsaved</span>
		{/if}
	</div>

	<div class="mt-4 space-y-4">
		<div>
			<label class="label dark:text-gray-200" for="task-note">Notes</label>
			<textarea
				id="task-note"
				rows="4"
				bind:value={note}
				class="input dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
				placeholder="Capture handoff details, next steps, or client notes..."
			></textarea>
			<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				{note.length} characters
			</div>
		</div>

		<div>
			<label class="label dark:text-gray-200" for="task-reminder">Reminder date</label>
			<input
				id="task-reminder"
				type="date"
				bind:value={reminderDate}
				class="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
			/>
			{#if reminderStatus}
				<p
					class={`mt-1 text-xs ${
						reminderStatus.tone === 'warn'
							? 'text-amber-600 dark:text-amber-400'
							: reminderStatus.tone === 'error'
								? 'text-red-600 dark:text-red-400'
								: 'text-gray-500 dark:text-gray-400'
					}`}
				>
					{reminderStatus.label}
				</p>
			{/if}
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<button type="button" class="btn btn-primary" onclick={saveNotes}>
				Save Notes
			</button>
			<button type="button" class="btn btn-secondary" onclick={clearNotes}>
				Clear
			</button>
			{#if lastSavedAt}
				<span class="text-xs text-gray-500 dark:text-gray-400">
					Last saved {new Date(lastSavedAt).toLocaleString()}
				</span>
			{/if}
		</div>

		{#if statusMessage}
			<p
				class={`text-sm ${
					statusTone === 'error'
						? 'text-red-600 dark:text-red-400'
						: statusTone === 'warn'
							? 'text-amber-600 dark:text-amber-400'
							: 'text-green-600 dark:text-green-400'
				}`}
			>
				{statusMessage}
			</p>
		{/if}
	</div>
</div>
