<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api/client';
	import type { Comment } from '$lib/types';
	import { formatDistanceToNow } from 'date-fns';
	import { Send } from '@lucide/svelte';

    /**
     * Component to display and add comments for a task.
     * Fetches comments from the API and supports adding new ones.
     */
	interface Props {
		taskId: string;
	}

	const { taskId }: Props = $props();

	let comments = $state<Comment[]>([]);
	let newComment = $state('');
	let loading = $state(false);
	let sending = $state(false);

	async function loadComments() {
		loading = true;
		try {
			comments = await api.getTaskComments(taskId);
		} catch (error) {
			console.error('Failed to load comments:', error);
		} finally {
			loading = false;
		}
	}

	async function handleSubmit() {
		if (!newComment.trim()) return;

		sending = true;
		try {
			const comment = await api.addTaskComment(taskId, newComment);
			// Optimistic update or reload? Mock server returns success message usually, but let's assume it returns the comment
            // If mock server returns just message, we can construct a fake comment for now
            const createdComment: Comment = comment.id ? comment : {
                id: 'temp-' + Date.now(),
                message: newComment,
                authorId: 'me',
                timestamp: new Date().toISOString()
            };
            
			comments = [...comments, createdComment];
			newComment = '';
		} catch (error) {
			console.error('Failed to add comment:', error);
		} finally {
			sending = false;
		}
	}

	onMount(() => {
		loadComments();
	});
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
	<div class="p-4 border-b border-gray-200 bg-gray-50">
		<h3 class="text-lg font-semibold text-gray-900">Comments</h3>
	</div>

	<div class="p-4 space-y-4 max-h-[400px] overflow-y-auto">
		{#if loading}
			<div class="text-center text-gray-500 py-4">Loading comments...</div>
		{:else if comments.length === 0}
			<div class="text-center text-gray-500 py-4">No comments yet.</div>
		{:else}
			{#each comments as comment}
				<div class="flex space-x-3">
					<div class="flex-shrink-0">
						<div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
							{comment.authorId.slice(0, 2).toUpperCase()}
						</div>
					</div>
					<div class="flex-grow">
						<div class="text-sm">
							<span class="font-medium text-gray-900">{comment.authorId}</span>
							<span class="text-gray-500 ml-2 text-xs">
								{formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
							</span>
						</div>
						<div class="mt-1 text-sm text-gray-700 bg-gray-50 p-2 rounded-md">
							{comment.message}
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<div class="p-4 border-t border-gray-200 bg-gray-50">
		<div class="flex space-x-2">
			<input
				type="text"
				bind:value={newComment}
				placeholder="Add a comment..."
				class="flex-grow rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2"
				onkeydown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                disabled={sending}
			/>
			<button
				onclick={handleSubmit}
				disabled={!newComment.trim() || sending}
				class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if sending}
					...
				{:else}
					<Send class="h-4 w-4" />
				{/if}
			</button>
		</div>
	</div>
</div>
