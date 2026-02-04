<script lang="ts">
	import { onMount } from 'svelte';
	import type { ProcessInstance } from '$lib/types';
	import { api } from '$lib/api/client';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
	import { toast } from 'svelte-sonner';

	let instances = $state<ProcessInstance[]>([]);

	async function loadProcesses() {
		try {
			const page = await api.getMyProcesses();
			instances = page.content;
		} catch (error) {
			toast.error('Failed to fetch process instances.');
			console.error(error);
		}
	}

	onMount(loadProcesses);

	async function handleCancel(id: string) {
		if (!confirm('Are you sure you want to cancel this process instance?')) return;

		try {
			await api.cancelProcessInstance(id, 'User cancelled via My Processes');
			toast.success('Process instance cancelled.');
			await loadProcesses();
		} catch (error: any) {
			toast.error('Failed to cancel process instance: ' + (error?.message || 'Unknown error'));
			console.error(error);
		}
	}

	async function handleSuspend(id: string) {
		try {
			await api.suspendProcessInstance(id);
			toast.success('Process instance suspended.');
			await loadProcesses();
		} catch (error: any) {
			toast.error('Failed to suspend process instance: ' + (error?.message || 'Unknown error'));
			console.error(error);
		}
	}

	async function handleActivate(id: string) {
		try {
			await api.activateProcessInstance(id);
			toast.success('Process instance activated.');
			await loadProcesses();
		} catch (error: any) {
			toast.error('Failed to activate process instance: ' + (error?.message || 'Unknown error'));
			console.error(error);
		}
	}
</script>

<svelte:head>
	<title>Process Instances - BPM Demo</title>
</svelte:head>

<div class="p-4">
	<Card>
		<CardHeader>
			<CardTitle>Process Instances</CardTitle>
		</CardHeader>
		<CardContent>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>ID</TableHead>
						<TableHead>Process Definition ID</TableHead>
						<TableHead>Start Time</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each instances as instance}
						<TableRow>
							<TableCell>{instance.id}</TableCell>
							<TableCell>{instance.processDefinitionId}</TableCell>
							<TableCell>{new Date(instance.startTime).toLocaleString()}</TableCell>
							<TableCell>
								{#if instance.ended}
									Ended
								{:else if instance.suspended}
									Suspended
								{:else}
									Active
								{/if}
							</TableCell>
							<TableCell>
								{#if !instance.ended}
									{#if instance.suspended}
										<Button variant="outline" size="sm" onclick={() => handleActivate(instance.id)} class="mr-2">
											Activate
										</Button>
									{:else}
										<Button variant="outline" size="sm" onclick={() => handleSuspend(instance.id)} class="mr-2">
											Suspend
										</Button>
									{/if}
									<Button variant="destructive" size="sm" onclick={() => handleCancel(instance.id)}>
										Cancel
									</Button>
								{/if}
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</CardContent>
	</Card>
</div>
