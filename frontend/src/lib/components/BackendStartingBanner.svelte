<script lang="ts">
	import { backendStatus, type BackendState } from '$lib/stores/backendStatus';
	import { onMount } from 'svelte';

	let backendState = $state<BackendState>('ready');
	let currentAttempt = $state(0);
	let maxAttempts = $state(0);
	let errorMessage = $state<string | null>(null);
	let visible = $state(false);

	const progressPercent = $derived(
		maxAttempts > 0 ? Math.round((currentAttempt / maxAttempts) * 100) : 0
	);

	onMount(() => {
		const unsubscribe = backendStatus.subscribe((status) => {
			backendState = status.state;
			currentAttempt = status.currentAttempt;
			maxAttempts = status.maxAttempts;
			errorMessage = status.errorMessage;
			visible = status.state !== 'ready';
		});

		return unsubscribe;
	});
</script>

{#if visible}
	<div class="fixed top-0 left-0 right-0 z-[100] animate-slide-down">
		{#if backendState === 'starting'}
			<div class="bg-amber-500 text-white px-4 py-3 shadow-lg">
				<div class="max-w-4xl mx-auto flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<!-- Spinner icon -->
						<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						<div>
							<span class="font-semibold">Backend is starting up...</span>
							<span class="ml-2 text-amber-100">
								Attempt {currentAttempt} of {maxAttempts}
							</span>
						</div>
					</div>
					<div class="text-sm text-amber-100">
						Please wait, this may take a few seconds
					</div>
				</div>
				<!-- Progress bar -->
				<div class="max-w-4xl mx-auto mt-2">
					<div class="h-1 bg-amber-600 rounded-full overflow-hidden">
						<div
							class="h-full bg-white transition-all duration-300 ease-out"
							style="width: {progressPercent}%"
						></div>
					</div>
				</div>
			</div>
		{:else if backendState === 'error'}
			<div class="bg-red-500 text-white px-4 py-3 shadow-lg">
				<div class="max-w-4xl mx-auto flex items-center justify-between">
					<div class="flex items-center space-x-3">
						<!-- Error icon -->
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
						<div>
							<span class="font-semibold">Backend unavailable</span>
							{#if errorMessage}
								<span class="ml-2 text-red-100">{errorMessage}</span>
							{/if}
						</div>
					</div>
					<button
						onclick={() => window.location.reload()}
						class="px-3 py-1 bg-white text-red-600 rounded-md text-sm font-medium hover:bg-red-50 transition-colors"
					>
						Retry
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	@keyframes slide-down {
		from {
			transform: translateY(-100%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.animate-slide-down {
		animation: slide-down 0.3s ease-out;
	}
</style>
