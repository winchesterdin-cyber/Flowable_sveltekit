<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import TaskList from '$lib/components/TaskList.svelte';
	import TaskFilters from '$lib/components/TaskFilters.svelte';
	import DelegateTaskModal from '$lib/components/DelegateTaskModal.svelte';
	import type { Task } from '$lib/types';
	import Loading from '$lib/components/Loading.svelte';
	import ErrorDisplay from '$lib/components/ErrorDisplay.svelte';
	import { Download } from '@lucide/svelte';
	import { exportToCSV } from '$lib/utils';
	import { createLogger } from '$lib/utils/logger';
	import TaskInsights from '$lib/components/TaskInsights.svelte';
	import { getPriorityLabel } from '$lib/utils/theme';
	import { formatDate } from '$lib/utils/form-helpers';
	import { copyTextToClipboard, downloadTextFile } from '$lib/utils/clipboard';
	import {
		buildTaskInsightMetrics,
		filterTasksByInsight,
		type InsightFilter
	} from '$lib/utils/task-insights';

	let allTasks = $state<Task[]>([]);
	let loading = $state(true);
	let isRefreshing = $state(false);
	let hasLoaded = $state(false);
	let error = $state('');
	let insightFilter = $state<InsightFilter>('all');
	let lastUpdatedAt = $state<Date | null>(null);
	let autoRefreshEnabled = $state(false);
	let autoRefreshInterval = $state(60);
	let autoRefreshPaused = $state(false);
	let nextRefreshAt = $state<Date | null>(null);
	let refreshCountdown = $state(0);

	const logger = createLogger('TasksPage');
	const filtersStorageKey = 'taskFilters:lastUsed';
	const autoRefreshStorageKey = 'taskAutoRefresh:preferences';
	const shareableFilterKeys = ['text', 'assignee', 'priority', 'sortBy'] as const;
	
	let filters = $state({
		text: '',
		assignee: '',
		priority: '',
		sortBy: 'created_desc'
	});

	let showDelegateModal = $state(false);
	let delegateTaskId = $state<string | null>(null);
	const filteredTasks = $derived(filterTasksByInsight(allTasks, insightFilter));

	onMount(async () => {
		const urlFilters = loadFiltersFromQuery();
		const persistedFilters = loadStoredFilters();
		if (urlFilters) {
			filters = urlFilters;
			persistFilters(urlFilters);
		} else if (persistedFilters) {
			filters = persistedFilters;
			syncFiltersToQuery(persistedFilters);
		}
		restoreAutoRefreshPreferences();
		await loadTasks({ reason: 'initial' });
	});


	/**
	 * Read filter values from URL query parameters so users can share exact task views.
	 * URL values always take precedence over localStorage on first page load.
	 */
	function loadFiltersFromQuery() {
		if (typeof window === 'undefined') return null;
		const params = new URLSearchParams(window.location.search);
		const hasShareParams = shareableFilterKeys.some((key) => params.has(key));
		if (!hasShareParams) return null;

		const urlFilters = { ...filters };
		for (const key of shareableFilterKeys) {
			const value = params.get(key);
			if (value !== null) {
				urlFilters[key] = value;
			}
		}

		logger.info('Loaded task filters from URL', { filters: urlFilters });
		return urlFilters;
	}

	/**
	 * Keep the address bar in sync with currently active filters so users can
	 * bookmark/share task views without reloading the page.
	 */
	function syncFiltersToQuery(nextFilters: typeof filters) {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		for (const key of shareableFilterKeys) {
			const value = nextFilters[key];
			if (value) {
				params.set(key, value);
			} else {
				params.delete(key);
			}
		}
		const query = params.toString();
		const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
		window.history.replaceState({}, '', nextUrl);
	}

	/**
	 * Copy a shareable URL containing all active filters to clipboard.
	 */
	async function handleShareFilters(event: CustomEvent<typeof filters>) {
		const nextFilters = event.detail;
		syncFiltersToQuery(nextFilters);
		if (typeof window === 'undefined') return;

		try {
			await navigator.clipboard.writeText(window.location.href);
			toast.success('Filter link copied to clipboard');
			logger.info('Copied task filter link', { filters: nextFilters });
		} catch (err) {
			toast.error('Unable to copy link automatically. Copy it from your browser address bar.');
			logger.error('Failed to copy task filter link', err, { filters: nextFilters });
		}
	}

	/**
	 * Restore last-used filters from localStorage to keep task reviews consistent
	 * across refreshes. This avoids users reapplying filters repeatedly.
	 */
	function loadStoredFilters() {
		if (typeof window === 'undefined') return null;
		try {
			const stored = localStorage.getItem(filtersStorageKey);
			if (!stored) return null;
			const parsed = JSON.parse(stored) as typeof filters;
			if (!parsed || typeof parsed !== 'object') return null;
			return parsed;
		} catch (err) {
			logger.warn('Failed to load stored task filters', { err });
			return null;
		}
	}

	function persistFilters(nextFilters: typeof filters) {
		if (typeof window === 'undefined') return;
		localStorage.setItem(filtersStorageKey, JSON.stringify(nextFilters));
	}

	type TaskLoadOptions = {
		silent?: boolean;
		reason?: 'initial' | 'manual' | 'filters' | 'auto-refresh' | 'delegation';
	};

	/**
	 * Fetch tasks and keep the UI responsive when refreshing in the background.
	 * `silent` refreshes keep the current list visible while we update.
	 */
	async function loadTasks(options: TaskLoadOptions = {}) {
		const { silent = false, reason = 'manual' } = options;
		const shouldShowLoading = !silent || !hasLoaded;
		if (shouldShowLoading) {
			loading = true;
		} else {
			isRefreshing = true;
		}
		error = shouldShowLoading ? '' : error;
		try {
			// Convert filters to API params
			// If filters.assignee is empty, we don't filter by assignee.
			// The original "Tabs" logic was client-side or specific endpoints.
			// Now we use the powerful search endpoint.
			
			const apiFilters: Record<string, string | number> = {};
			if (filters.text) apiFilters.text = filters.text;
			if (filters.assignee) apiFilters.assignee = filters.assignee;
			if (filters.priority) apiFilters.priority = Number(filters.priority);

			logger.info('Loading tasks with filters', { filters: apiFilters, reason });
			allTasks = await api.getTasks(apiFilters);
			const insights = buildTaskInsightMetrics(allTasks);
			lastUpdatedAt = new Date();
			hasLoaded = true;
			logger.info('Loaded tasks', { count: allTasks.length, insights, reason });
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to load tasks';
			if (hasLoaded && silent) {
				toast.error('Background refresh failed. Showing last saved results.');
				logger.warn('Background refresh failed', {
					reason,
					error: err instanceof Error ? err.message : String(err)
				});
			} else {
				error = message;
				logger.error('Failed to load tasks', err, { reason });
			}
		} finally {
			loading = false;
			isRefreshing = false;
		}
	}

	function handleExport() {
		if (allTasks.length === 0) {
			toast.error('No tasks to export');
			logger.warn('Export skipped because no tasks are available');
			return;
		}
		const exportData = allTasks.map(t => ({
			ID: t.id,
			Name: t.name,
			Assignee: t.assignee || 'Unassigned',
			Priority: t.priority,
			Created: t.createTime
		}));
		exportToCSV(exportData, `tasks_export_${new Date().toISOString().split('T')[0]}.csv`);
		toast.success('Tasks exported successfully');
		logger.info('Exported tasks to CSV', { count: exportData.length });
	}

	function handleFilterChange(event: CustomEvent) {
		filters = event.detail;
		persistFilters(filters);
		syncFiltersToQuery(filters);
		logger.info('Task filters updated', { filters });
		loadTasks({ reason: 'filters' });
	}

	function handleInsightChange(nextInsight: InsightFilter) {
		insightFilter = nextInsight;
		logger.info('Task insight filter updated', { insight: nextInsight });
	}

	function handleTaskClick(taskId: string) {
		logger.info('Navigating to task details', { taskId });
		goto(`/tasks/${taskId}`);
	}

	async function handleClaim(taskId: string) {
		try {
			await api.claimTask(taskId);
			toast.success('Task claimed successfully');
			logger.info('Task claimed', { taskId });
			await loadTasks({ reason: 'manual' });
		} catch (e) {
			toast.error('Failed to claim task');
			logger.error('Failed to claim task', e, { taskId });
		}
	}

	async function handleUnclaim(taskId: string) {
		try {
			await api.unclaimTask(taskId);
			toast.success('Task unclaimed successfully');
			logger.info('Task unclaimed', { taskId });
			await loadTasks({ reason: 'manual' });
		} catch (e) {
			toast.error('Failed to unclaim task');
			logger.error('Failed to unclaim task', e, { taskId });
		}
	}

	function handleDelegate(taskId: string) {
		delegateTaskId = taskId;
		showDelegateModal = true;
		logger.info('Opened delegate modal', { taskId });
	}

	function onDelegateSuccess() {
		loadTasks({ reason: 'delegation' });
		logger.info('Task delegation completed');
	}

	async function handleBulkClaim(taskIds: string[]) {
		if (!confirm(`Are you sure you want to claim ${taskIds.length} tasks?`)) return;
		
		loading = true;
		try {
			logger.info('Bulk claim started', { count: taskIds.length });
			await Promise.all(taskIds.map(id => api.claimTask(id)));
			toast.success(`Successfully claimed ${taskIds.length} tasks`);
			await loadTasks({ reason: 'manual' });
		} catch (e) {
			toast.error('Failed to claim some tasks');
			logger.error('Bulk claim failed', e, { count: taskIds.length });
			await loadTasks({ reason: 'manual' }); // Reload to reflect partial success
		} finally {
			loading = false;
		}
	}

	async function handleBulkUnclaim(taskIds: string[]) {
		if (!confirm(`Are you sure you want to unclaim ${taskIds.length} tasks?`)) return;

		loading = true;
		try {
			logger.info('Bulk unclaim started', { count: taskIds.length });
			await Promise.all(taskIds.map(id => api.unclaimTask(id)));
			toast.success(`Successfully unclaimed ${taskIds.length} tasks`);
			await loadTasks({ reason: 'manual' });
		} catch (e) {
			toast.error('Failed to unclaim some tasks');
			logger.error('Bulk unclaim failed', e, { count: taskIds.length });
			await loadTasks({ reason: 'manual' });
		} finally {
			loading = false;
		}
	}

	/**
	 * Build a compact, shareable task summary string for handoffs or updates.
	 * We include the detail URL so recipients can jump directly to the task.
	 */
	function buildTaskSummary(task: Task) {
		const detailUrl = browser ? `${window.location.origin}/tasks/${task.id}` : `/tasks/${task.id}`;
		const dueDate = task.dueDate ? formatDate(task.dueDate) : 'No due date';
		const assignee = task.assignee || 'Unassigned';
		return [
			`Task: ${task.name}`,
			`Process: ${task.processName}`,
			`Priority: ${getPriorityLabel(task.priority)}`,
			`Assignee: ${assignee}`,
			`Created: ${formatDate(task.createTime)}`,
			`Due: ${dueDate}`,
			`Link: ${detailUrl}`
		].join('\n');
	}

	async function handleCopySummary(task: Task) {
		if (!browser) return;
		const summary = buildTaskSummary(task);
		try {
			const copied = await copyTextToClipboard(summary);
			if (!copied) {
				toast.error('Unable to copy task summary. Please try again.');
				logger.warn('Task summary copy failed', { taskId: task.id });
				return;
			}
			toast.success('Task summary copied to clipboard');
			logger.info('Task summary copied', { taskId: task.id });
		} catch (err) {
			toast.error('Unable to copy task summary. Please try again.');
			logger.error('Task summary copy failed', err, { taskId: task.id });
		}
	}

	/**
	 * Copy multiple summaries at once to help with batch handoffs.
	 * Summaries are separated with a divider for easy scanning.
	 */
	async function handleBulkCopySummaries(tasks: Task[]) {
		if (!browser) return;
		if (tasks.length === 0) {
			toast.error('Select at least one task to copy summaries.');
			logger.warn('Bulk copy skipped because no tasks were selected');
			return;
		}
		const summary = tasks.map(buildTaskSummary).join('\n\n---\n\n');
		try {
			const copied = await copyTextToClipboard(summary);
			if (!copied) {
				toast.error('Unable to copy task summaries. Please try again.');
				logger.warn('Bulk task summary copy failed', { count: tasks.length });
				return;
			}
			toast.success(`Copied ${tasks.length} task summaries`);
			logger.info('Bulk task summaries copied', { count: tasks.length });
		} catch (err) {
			toast.error('Unable to copy task summaries. Please try again.');
			logger.error('Bulk task summary copy failed', err, { count: tasks.length });
		}
	}

	/**
	 * Download multiple summaries as a text file for offline handoffs or reporting.
	 * The file includes a timestamp to avoid overwriting previous exports.
	 */
	function handleBulkDownloadSummaries(tasks: Task[]) {
		if (!browser) return;
		if (tasks.length === 0) {
			toast.error('Select at least one task to download summaries.');
			logger.warn('Bulk download skipped because no tasks were selected');
			return;
		}
		const summary = tasks.map(buildTaskSummary).join('\n\n---\n\n');
		downloadTextFile(summary, `task-summaries-${new Date().toISOString().slice(0, 10)}.txt`);
		toast.success(`Downloaded ${tasks.length} task summaries`);
		logger.info('Bulk task summaries downloaded', { count: tasks.length });
	}

	/**
	 * Export only the selected tasks to CSV for targeted reporting.
	 */
	function handleBulkExportSelected(tasks: Task[]) {
		if (tasks.length === 0) {
			toast.error('Select at least one task to export.');
			logger.warn('Bulk export skipped because no tasks were selected');
			return;
		}
		const exportData = tasks.map((task) => ({
			ID: task.id,
			Name: task.name,
			Assignee: task.assignee || 'Unassigned',
			Priority: task.priority,
			Created: task.createTime
		}));
		exportToCSV(exportData, `tasks_selected_${new Date().toISOString().split('T')[0]}.csv`);
		toast.success(`Exported ${tasks.length} selected tasks`);
		logger.info('Exported selected tasks to CSV', { count: tasks.length });
	}

	function restoreAutoRefreshPreferences() {
		if (!browser) return;
		try {
			const stored = localStorage.getItem(autoRefreshStorageKey);
			if (!stored) return;
			const parsed = JSON.parse(stored) as {
				autoRefreshEnabled?: boolean;
				autoRefreshInterval?: number;
			};
			autoRefreshEnabled = parsed.autoRefreshEnabled ?? false;
			autoRefreshInterval = parsed.autoRefreshInterval ?? 60;
			logger.info('Loaded auto-refresh preferences', { autoRefreshEnabled, autoRefreshInterval });
		} catch (err) {
			logger.warn('Failed to load auto-refresh preferences', { err });
		}
	}

	/**
	 * Persist user-selected auto-refresh preferences to reduce repeat setup.
	 */
	function persistAutoRefreshPreferences() {
		if (!browser) return;
		localStorage.setItem(
			autoRefreshStorageKey,
			JSON.stringify({ autoRefreshEnabled, autoRefreshInterval })
		);
	}

	function handleManualRefresh() {
		logger.info('Manual refresh triggered');
		loadTasks({ silent: true, reason: 'manual' });
	}

	$effect(() => {
		if (!browser) return;
		persistAutoRefreshPreferences();
		logger.info('Auto-refresh preference updated', { autoRefreshEnabled, autoRefreshInterval });
	});

	$effect(() => {
		if (!browser || !autoRefreshEnabled) return;
		nextRefreshAt = new Date(Date.now() + autoRefreshInterval * 1000);
		const intervalId = window.setInterval(() => {
			if (document.hidden) {
				autoRefreshPaused = true;
				return;
			}
			autoRefreshPaused = false;
			logger.info('Auto-refresh tick');
			loadTasks({ silent: true, reason: 'auto-refresh' });
			nextRefreshAt = new Date(Date.now() + autoRefreshInterval * 1000);
		}, autoRefreshInterval * 1000);
		return () => window.clearInterval(intervalId);
	});

	$effect(() => {
		if (!browser || !autoRefreshEnabled) {
			autoRefreshPaused = false;
			nextRefreshAt = null;
			refreshCountdown = 0;
			return;
		}

		const tickId = window.setInterval(() => {
			if (!nextRefreshAt) {
				refreshCountdown = 0;
				return;
			}
			const remainingSeconds = Math.max(
				0,
				Math.ceil((nextRefreshAt.getTime() - Date.now()) / 1000)
			);
			refreshCountdown = remainingSeconds;
		}, 1000);

		const handleVisibility = () => {
			if (!autoRefreshEnabled) return;
			if (document.hidden) {
				autoRefreshPaused = true;
				nextRefreshAt = null;
				refreshCountdown = 0;
				logger.info('Auto-refresh paused due to hidden tab');
				return;
			}
			autoRefreshPaused = false;
			nextRefreshAt = new Date(Date.now() + autoRefreshInterval * 1000);
			logger.info('Auto-refresh resumed');
		};

		document.addEventListener('visibilitychange', handleVisibility);

		return () => {
			window.clearInterval(tickId);
			document.removeEventListener('visibilitychange', handleVisibility);
		};
	});
</script>

<svelte:head>
	<title>Tasks - BPM Demo</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-8">
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Tasks</h1>
			<p class="text-gray-600 mt-1">Manage your workflow tasks</p>
			{#if lastUpdatedAt}
				<p class="text-xs text-gray-500 mt-1">
					Last updated {lastUpdatedAt.toLocaleTimeString()}
				</p>
			{/if}
		</div>

		<div class="flex flex-col sm:flex-row gap-2 sm:items-center">
			<div class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={autoRefreshEnabled} class="h-4 w-4 text-blue-600" />
					<span class="font-medium">Auto refresh</span>
				</label>
				<select
					class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs"
					value={autoRefreshInterval}
					onchange={(event) => {
						autoRefreshInterval = Number((event.target as HTMLSelectElement).value);
						logger.info('Auto-refresh interval updated', { autoRefreshInterval });
					}}
					disabled={!autoRefreshEnabled}
				>
					<option value={30}>30s</option>
					<option value={60}>1m</option>
					<option value={120}>2m</option>
					<option value={300}>5m</option>
				</select>
				{#if autoRefreshEnabled}
					<span class="text-gray-500">
						{#if autoRefreshPaused}
							Paused
						{:else}
							Next in {refreshCountdown}s
						{/if}
					</span>
				{/if}
			</div>

			<button onclick={handleExport} class="btn btn-outline flex items-center gap-2" disabled={loading || allTasks.length === 0}>
				<Download class="w-4 h-4" />
				Export CSV
			</button>
			<button onclick={handleManualRefresh} class="btn btn-secondary" disabled={loading || isRefreshing}>
				{loading || isRefreshing ? 'Refreshing...' : 'Refresh'}
			</button>
		</div>
	</div>

	<TaskFilters initialFilters={filters} on:change={handleFilterChange} on:share={handleShareFilters} />
	<TaskInsights
		tasks={allTasks}
		activeInsight={insightFilter}
		loading={loading}
		onInsightChange={handleInsightChange}
	/>

	{#if loading}
		<Loading text="Loading tasks..." />
	{:else if error}
		<ErrorDisplay {error} onRetry={loadTasks} title="Error Loading Tasks" />
	{:else}
		<TaskList
			tasks={filteredTasks}
			sortBy={filters.sortBy}
			onTaskClick={handleTaskClick}
			onClaim={handleClaim}
			onUnclaim={handleUnclaim}
			onDelegate={handleDelegate}
			onCopySummary={handleCopySummary}
			onBulkCopySummary={handleBulkCopySummaries}
			onBulkDownloadSummaries={handleBulkDownloadSummaries}
			onBulkExportSelected={handleBulkExportSelected}
			onBulkClaim={handleBulkClaim}
			onBulkUnclaim={handleBulkUnclaim}
			emptyMessage={
				insightFilter === 'all'
					? 'No tasks found matching your filters.'
					: 'No tasks match the selected insight filter.'
			}
		/>
	{/if}

	<DelegateTaskModal
		open={showDelegateModal}
		taskId={delegateTaskId}
		onClose={() => (showDelegateModal = false)}
		onSuccess={onDelegateSuccess}
	/>
</div>
