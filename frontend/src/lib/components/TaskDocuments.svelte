<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api/client';
	import type { DocumentDTO } from '$lib/types';
	import { FileText, Trash2, Upload, Download } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		taskId: string;
		readonly?: boolean;
	}

	const { taskId, readonly = false }: Props = $props();

	let documents = $state<DocumentDTO[]>([]);
	let loading = $state(false);
	let uploading = $state(false);
	let fileInput = $state<HTMLInputElement>();

	async function loadDocuments() {
		loading = true;
		try {
			documents = await api.getTaskDocuments(taskId);
		} catch (error) {
			console.error('Failed to load documents:', error);
			toast.error('Failed to load documents');
		} finally {
			loading = false;
		}
	}

	async function handleUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		uploading = true;
		try {
			const newDoc = await api.uploadTaskDocument(taskId, file);
			// Optimistically add to list (or use returned object if backend returns it properly)
			documents = [...documents, newDoc];
			toast.success('Document uploaded successfully');
		} catch (error) {
			console.error('Failed to upload document:', error);
			toast.error('Failed to upload document');
		} finally {
			uploading = false;
			if (fileInput) fileInput.value = ''; // Reset input
		}
	}

	async function handleDelete(docId: string) {
		if (!confirm('Are you sure you want to remove this document?')) return;

		try {
			await api.deleteTaskDocument(taskId, docId);
			documents = documents.filter((d) => d.id !== docId);
			toast.success('Document removed');
		} catch (error) {
			console.error('Failed to delete document:', error);
			toast.error('Failed to delete document');
		}
	}

	function formatBytes(bytes: number, decimals = 2) {
		if (!+bytes) return '0 Bytes';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
	}

	onMount(() => {
		loadDocuments();
	});
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
	<div class="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
		<h3 class="text-lg font-semibold text-gray-900">Documents</h3>
		{#if !readonly}
			<button
				onclick={() => fileInput?.click()}
				disabled={uploading}
				class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
			>
				{#if uploading}
					<span class="mr-2 h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
					Uploading...
				{:else}
					<Upload class="h-3 w-3 mr-1.5" />
					Upload
				{/if}
			</button>
			<input
				bind:this={fileInput}
				type="file"
				class="hidden"
				onchange={handleUpload}
			/>
		{/if}
	</div>

	<div class="divide-y divide-gray-100">
		{#if loading}
			<div class="p-8 text-center text-gray-500 text-sm">Loading documents...</div>
		{:else if documents.length === 0}
			<div class="p-8 text-center text-gray-500 text-sm">No documents attached.</div>
		{:else}
			{#each documents as doc}
				<div class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
					<div class="flex items-center min-w-0 flex-1">
						<div class="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
							<FileText class="h-5 w-5" />
						</div>
						<div class="ml-4 min-w-0 flex-1">
							<p class="text-sm font-medium text-gray-900 truncate" title={doc.name}>
								{doc.name}
							</p>
							<p class="text-xs text-gray-500">
								{formatBytes(doc.size)} • {new Date(doc.createdAt).toLocaleDateString()} by {doc.createdBy}
							</p>
						</div>
					</div>
					<div class="ml-4 flex items-center space-x-2">
						<button
							class="p-1 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
							title="Download"
						>
							<Download class="h-4 w-4" />
						</button>
						{#if !readonly}
							<button
								onclick={() => handleDelete(doc.id)}
								class="p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
								title="Delete"
							>
								<Trash2 class="h-4 w-4" />
							</button>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
