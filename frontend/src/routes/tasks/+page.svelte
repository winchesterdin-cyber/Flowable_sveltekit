<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api/client';
	import { toast } from 'svelte-sonner';
	import TaskList from '$lib/components/TaskList.svelte';
	import TaskFilters from '$lib/components/TaskFilters.svelte';
	import DelegateTaskModal from '$lib/components/DelegateTaskModal.svelte';
	import type { Task } from '$lib/types';
	import Loading from '$lib/components/Loading.svelte';
	import ErrorDisplay from '$lib/components/ErrorDisplay.svelte';

	let allTasks = $state<Task[]>([]);
	let loading = $state(true);
	let error = $state('');
	
	let filters = $state({
		text: '',
		assignee: '',
		priority: ''
	});

	let showDelegateModal = $state(false);
	let delegateTaskId = $state<string | null>(null);

	onMount(async () => {
		await loadTasks();
	});

	async function loadTasks() {
		loading = true;
		error = '';
		try {
			// Convert filters to API params
			// If filters.assignee is empty, we don't filter by assignee.
			// The original "Tabs" logic was client-side or specific endpoints.
			// Now we use the powerful search endpoint.
			
			const apiFilters: any = {};
			if (filters.text) apiFilters.text = filters.text;
			if (filters.assignee) apiFilters.assignee = filters.assignee;
			if (filters.priority) apiFilters.priority = Number(filters.priority);

			allTasks = await api.getTasks(apiFilters);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load tasks';
		} finally {
			loading = false;
		}
	}

	function handleFilterChange(event: CustomEvent) {
		filters = event.detail;
		loadTasks();
	}

	function handleTaskClick(taskId: string) {
		goto(`/tasks/${taskId}`);
	}

	async function handleClaim(taskId: string) {
		try {
			await api.claimTask(taskId);
			toast.success('Task claimed successfully');
			await loadTasks();
		} catch (e) {
			toast.error('Failed to claim task');
		}
	}

	async function handleUnclaim(taskId: string) {
		try {
			await api.unclaimTask(taskId);
			toast.success('Task unclaimed successfully');
			await loadTasks();
		} catch (e) {
			toast.error('Failed to unclaim task');
		}
	}

	function handleDelegate(taskId: string) {
		delegateTaskId = taskId;
		showDelegateModal = true;
	}

	function onDelegateSuccess() {
		loadTasks();
	}
</script>

<svelte:head>
	<title>Tasks - BPM Demo</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-8">
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Tasks</h1>
			<p class="text-gray-600 mt-1">Manage your workflow tasks</p>
		</div>

		<button onclick={loadTasks} class="btn btn-secondary" disabled={loading}>
			{loading ? 'Refreshing...' : 'Refresh'}
		</button>
	</div>

    <TaskFilters on:change={handleFilterChange} />

	{#if loading}
		<Loading text="Loading tasks..." />
	{:else if error}
		<ErrorDisplay {error} onRetry={loadTasks} title="Error Loading Tasks" />
	{:else}
		<TaskList
			tasks={allTasks}
			onTaskClick={handleTaskClick}
			onClaim={handleClaim}
			onUnclaim={handleUnclaim}
			onDelegate={handleDelegate}
			emptyMessage="No tasks found matching your filters."
		/>
	{/if}

	<DelegateTaskModal
		open={showDelegateModal}
		taskId={delegateTaskId}
		onClose={() => (showDelegateModal = false)}
		onSuccess={onDelegateSuccess}
	/>
</div>
