<script lang="ts">
	import type { Task } from '$lib/types';
	import TaskCard from './TaskCard.svelte';
	import EmptyState from './EmptyState.svelte';
	import { CheckSquare, Copy, Download, FileDown, Square, UserCheck, UserX } from '@lucide/svelte';

	interface Props {
		tasks: Task[];
		sortBy?: string;
		onTaskClick: (taskId: string) => void;
		onClaim?: (taskId: string) => void;
		onUnclaim?: (taskId: string) => void;
		onDelegate?: (taskId: string) => void;
		onCopySummary?: (task: Task) => void;
		onBulkCopySummary?: (tasks: Task[]) => void;
		onBulkDownloadSummaries?: (tasks: Task[]) => void;
		onBulkExportSelected?: (tasks: Task[]) => void;
		onBulkClaim?: (taskIds: string[]) => void;
		onBulkUnclaim?: (taskIds: string[]) => void;
		emptyMessage?: string;
	}

	const {
		tasks,
		sortBy = 'created_desc',
		onTaskClick,
		onClaim,
		onUnclaim,
		onDelegate,
		onCopySummary,
		onBulkCopySummary,
		onBulkDownloadSummaries,
		onBulkExportSelected,
		onBulkClaim,
		onBulkUnclaim,
		emptyMessage = 'No tasks found'
	}: Props = $props();

	let selectedIds = $state<Set<string>>(new Set());

	const sortedTasks = $derived(
		[...tasks].sort((a, b) => {
			switch (sortBy) {
				case 'created_asc':
					return new Date(a.createTime).getTime() - new Date(b.createTime).getTime();
				case 'created_desc':
					return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
				case 'priority_desc':
					return b.priority - a.priority;
				case 'priority_asc':
					return a.priority - b.priority;
				case 'due_asc':
					return (new Date(a.dueDate || '9999-12-31').getTime()) - (new Date(b.dueDate || '9999-12-31').getTime());
				case 'due_desc':
					return (new Date(b.dueDate || '1970-01-01').getTime()) - (new Date(a.dueDate || '1970-01-01').getTime());
				default:
					return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
			}
		})
	);

	function handleSelect(taskId: string, selected: boolean) {
		const newSet = new Set(selectedIds);
		if (selected) {
			newSet.add(taskId);
		} else {
			newSet.delete(taskId);
		}
		selectedIds = newSet;
	}

	function toggleSelectAll() {
		if (selectedIds.size === sortedTasks.length) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(sortedTasks.map((t) => t.id));
		}
	}

	function handleBulkClaim() {
		if (onBulkClaim) onBulkClaim(Array.from(selectedIds));
		selectedIds = new Set();
	}

	function handleBulkUnclaim() {
		if (onBulkUnclaim) onBulkUnclaim(Array.from(selectedIds));
		selectedIds = new Set();
	}

	function handleBulkCopy() {
		if (!onBulkCopySummary) return;
		const selectedTasks = sortedTasks.filter((task) => selectedIds.has(task.id));
		onBulkCopySummary(selectedTasks);
		selectedIds = new Set();
	}

	function handleBulkDownload() {
		if (!onBulkDownloadSummaries) return;
		const selectedTasks = sortedTasks.filter((task) => selectedIds.has(task.id));
		onBulkDownloadSummaries(selectedTasks);
		selectedIds = new Set();
	}

	function handleBulkExportSelected() {
		if (!onBulkExportSelected) return;
		const selectedTasks = sortedTasks.filter((task) => selectedIds.has(task.id));
		onBulkExportSelected(selectedTasks);
		selectedIds = new Set();
	}
</script>

	{#if sortedTasks.length === 0}
		<EmptyState message={emptyMessage} />
	{:else}
		<!-- Bulk Actions Toolbar -->
		{#if onBulkClaim || onBulkUnclaim || onBulkCopySummary || onBulkDownloadSummaries || onBulkExportSelected}
			<div
				class="flex flex-wrap items-center justify-between gap-4 mb-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
				aria-label="Bulk task actions"
				role="region"
			>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={toggleSelectAll}
						aria-pressed={selectedIds.size === sortedTasks.length && sortedTasks.length > 0}
						disabled={sortedTasks.length === 0}
						aria-disabled={sortedTasks.length === 0}
						class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
					>
						{#if selectedIds.size === sortedTasks.length && sortedTasks.length > 0}
							<CheckSquare class="w-4 h-4 text-blue-600" />
							Deselect All
						{:else}
							<Square class="w-4 h-4 text-gray-400" />
							Select All
						{/if}
					</button>
					<span class="text-sm text-gray-500 border-l pl-3 ml-1" aria-live="polite">
						{selectedIds.size} selected
					</span>
				</div>

				<div class="flex items-center gap-2">
					{#if onBulkCopySummary}
						<button
							type="button"
							onclick={handleBulkCopy}
							disabled={selectedIds.size === 0}
							aria-disabled={selectedIds.size === 0}
							class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
						>
							<Copy class="w-4 h-4" />
							Copy Summaries
						</button>
					{/if}
					{#if onBulkDownloadSummaries}
						<button
							type="button"
							onclick={handleBulkDownload}
							disabled={selectedIds.size === 0}
							aria-disabled={selectedIds.size === 0}
							class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
						>
							<Download class="w-4 h-4" />
							Download Summaries
						</button>
					{/if}
					{#if onBulkExportSelected}
						<button
							type="button"
							onclick={handleBulkExportSelected}
							disabled={selectedIds.size === 0}
							aria-disabled={selectedIds.size === 0}
							class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
						>
							<FileDown class="w-4 h-4" />
							Export Selected
						</button>
					{/if}
					{#if onBulkClaim}
						<button
							type="button"
							onclick={handleBulkClaim}
							disabled={selectedIds.size === 0}
							aria-disabled={selectedIds.size === 0}
							class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
						>
							<UserCheck class="w-4 h-4" />
							Claim Selected
						</button>
					{/if}
					{#if onBulkUnclaim}
						<button
							type="button"
							onclick={handleBulkUnclaim}
							disabled={selectedIds.size === 0}
							aria-disabled={selectedIds.size === 0}
							class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
						>
							<UserX class="w-4 h-4" />
							Unclaim Selected
						</button>
					{/if}
				</div>
			</div>
		{/if}

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each sortedTasks as task (task.id)}
			<TaskCard
				{task}
				selected={selectedIds.has(task.id)}
				onclick={() => onTaskClick(task.id)}
				{onClaim}
				{onUnclaim}
				{onDelegate}
				{onCopySummary}
				onSelect={handleSelect}
			/>
		{/each}
	</div>
{/if}
