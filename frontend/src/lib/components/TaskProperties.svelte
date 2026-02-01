<script lang="ts">
	import { api } from '$lib/api/client';
	import type { Task } from '$lib/types';
	import { toast } from 'svelte-sonner';
	import { Calendar, AlertCircle, User, Edit2, Check, X } from '@lucide/svelte';

	interface Props {
		task: Task;
		onUpdate: (updatedTask: Task) => void;
	}

	const { task, onUpdate }: Props = $props();

	let isEditing = $state(false);
	let saving = $state(false);

	let editPriority = $state(0);
	let editDueDate = $state('');

	// Sync initial values from task prop
	$effect(() => {
		if (!isEditing) {
			editPriority = task.priority;
			editDueDate = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '';
		}
	});

	function toggleEdit() {
		if (isEditing) {
			// Cancel
			isEditing = false;
			// Effect will sync values back
		} else {
			// Start edit
			isEditing = true;
			editPriority = task.priority;
			editDueDate = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '';
		}
	}

	async function saveChanges() {
		saving = true;
		try {
			const updates: Partial<Task> = {
				priority: editPriority,
				dueDate: editDueDate ? new Date(editDueDate).toISOString() : undefined
			};

			await api.updateTask(task.id, updates);
			onUpdate({ ...task, ...updates }); // Optimistic/Merged update
			toast.success('Task properties updated');
			isEditing = false;
		} catch (error) {
			console.error('Failed to update task:', error);
			toast.error('Failed to update task');
		} finally {
			saving = false;
		}
	}

	function getPriorityLabel(priority: number) {
		if (priority >= 75) return 'High';
		if (priority >= 50) return 'Medium';
		return 'Low';
	}

	function getPriorityColor(priority: number) {
		if (priority >= 75) return 'text-red-700 bg-red-100';
		if (priority >= 50) return 'text-yellow-700 bg-yellow-100';
		return 'text-green-700 bg-green-100';
	}
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
	<div class="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
		<h3 class="text-lg font-semibold text-gray-900">Details</h3>
		<button
			onclick={toggleEdit}
			class="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
			title={isEditing ? 'Cancel' : 'Edit Properties'}
		>
			{#if isEditing}
				<X class="h-4 w-4" />
			{:else}
				<Edit2 class="h-4 w-4" />
			{/if}
		</button>
	</div>

	<div class="p-4 space-y-4">
		<!-- Assignee -->
		<div>
			<div class="flex items-center text-sm text-gray-500 mb-1">
				<User class="h-4 w-4 mr-2" />
				Assignee
			</div>
			<div class="font-medium text-gray-900 pl-6">
				{task.assignee || 'Unassigned'}
			</div>
		</div>

		<!-- Priority -->
		<div>
			<div class="flex items-center text-sm text-gray-500 mb-1">
				<AlertCircle class="h-4 w-4 mr-2" />
				Priority
			</div>
			<div class="pl-6">
				{#if isEditing}
					<select
						bind:value={editPriority}
						class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1 border"
					>
						<option value={25}>Low (25)</option>
						<option value={50}>Medium (50)</option>
						<option value={75}>High (75)</option>
						<option value={100}>Critical (100)</option>
					</select>
				{:else}
					<span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
						{getPriorityLabel(task.priority)} ({task.priority})
					</span>
				{/if}
			</div>
		</div>

		<!-- Due Date -->
		<div>
			<div class="flex items-center text-sm text-gray-500 mb-1">
				<Calendar class="h-4 w-4 mr-2" />
				Due Date
			</div>
			<div class="pl-6">
				{#if isEditing}
					<input
						type="date"
						bind:value={editDueDate}
						class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1 border"
					/>
				{:else}
					<span class="text-gray-900 font-medium">
						{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
					</span>
				{/if}
			</div>
		</div>

		{#if isEditing}
			<div class="pt-2 flex justify-end">
				<button
					onclick={saveChanges}
					disabled={saving}
					class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
				>
					{#if saving}
						...
					{:else}
						<Check class="h-3 w-3 mr-1.5" />
						Save
					{/if}
				</button>
			</div>
		{/if}
	</div>
</div>
