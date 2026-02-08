<script lang="ts">
	/* eslint-disable no-console */
	import { Search, Loader2, FileText } from '@lucide/svelte';
	import { api } from '$lib/api/client';
	import type { Task } from '$lib/types';
	import { goto } from '$app/navigation';

	let query = $state('');
	let results = $state<Task[]>([]);
	let loading = $state(false);
	let showResults = $state(false);
	let inputRef: HTMLInputElement;
	let containerRef: HTMLDivElement;
	let activeIndex = $state(-1);
	const resultsId = 'global-search-results';
	const optionIdPrefix = 'global-search-option';

	let debounceTimer: ReturnType<typeof setTimeout>;

	$effect(() => {
		if (results.length === 0) {
			activeIndex = -1;
		} else if (activeIndex >= results.length) {
			activeIndex = results.length - 1;
		}
	});

	function handleInput() {
		loading = true;
		showResults = true;
		clearTimeout(debounceTimer);
		activeIndex = -1;
		
		if (query.trim().length < 2) {
			results = [];
			loading = false;
			return;
		}

		debounceTimer = setTimeout(async () => {
			try {
				const response = await api.getTasks({ text: query });
				results = response.slice(0, 5); // Limit to 5 results
			} catch (error) {
				console.error('Search failed:', error);
				results = [];
			} finally {
				loading = false;
			}
		}, 300);
	}

	function handleSelect(task: Task) {
		goto(`/tasks/${task.id}`);
		showResults = false;
		query = '';
		activeIndex = -1;
	}

	function handleFocus() {
		if (query.trim().length >= 2) {
			showResults = true;
		}
	}

	function handleFocusOut(event: FocusEvent) {
		if (containerRef && !containerRef.contains(event.relatedTarget as Node)) {
			showResults = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!showResults || results.length === 0) {
			if (event.key === 'Escape') {
				showResults = false;
			}
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				activeIndex = (activeIndex + 1) % results.length;
				break;
			case 'ArrowUp':
				event.preventDefault();
				activeIndex = (activeIndex - 1 + results.length) % results.length;
				break;
			case 'Enter':
				if (activeIndex >= 0 && results[activeIndex]) {
					event.preventDefault();
					handleSelect(results[activeIndex]);
				} else {
					event.preventDefault();
				}
				break;
			case 'Escape':
				event.preventDefault();
				showResults = false;
				break;
		}
	}

    // Simple click outside handler
    function handleClickOutside(event: MouseEvent) {
        if (containerRef && !containerRef.contains(event.target as Node) && showResults) {
            showResults = false;
        }
    }
</script>

<svelte:window onclick={handleClickOutside} />

<div
	bind:this={containerRef}
	class="relative hidden md:block w-64 lg:w-80 mr-4"
	onfocusout={handleFocusOut}
>
	<div class="relative">
		<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
			<Search class="h-4 w-4 text-gray-400" />
		</div>
		<input
			bind:this={inputRef}
			type="text"
			bind:value={query}
			oninput={handleInput}
			onfocus={handleFocus}
			onkeydown={handleKeydown}
			placeholder="Search tasks..."
			role="combobox"
			aria-expanded={showResults}
			aria-controls={resultsId}
			aria-autocomplete="list"
			aria-activedescendant={
				activeIndex >= 0 && results[activeIndex]
					? `${optionIdPrefix}-${results[activeIndex].id}`
					: undefined
			}
			class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-600 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
		/>
		{#if loading}
			<div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
				<Loader2 class="h-4 w-4 text-blue-500 animate-spin" />
			</div>
		{/if}
	</div>
	<span class="sr-only" aria-live="polite">
		{#if loading}
			Loading results
		{:else if showResults && query.trim().length >= 2 && results.length === 0}
			No results found
		{:else if showResults && query.trim().length >= 2}
			{results.length} results available
		{/if}
	</span>

	{#if showResults && query.trim().length >= 2}
		<div
			id={resultsId}
			role="listbox"
			class="absolute mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm z-50"
		>
			{#if results.length > 0}
				<div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-700/50">
					Tasks
				</div>
				{#each results as task, index}
					<button
						onclick={() => handleSelect(task)}
						id={`${optionIdPrefix}-${task.id}`}
						role="option"
						aria-selected={index === activeIndex}
						class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-start gap-3 transition-colors {index === activeIndex ? 'bg-gray-100 dark:bg-gray-700' : ''}"
					>
						<FileText class="h-4 w-4 text-gray-400 mt-0.5" />
						<div class="min-w-0 flex-1">
							<div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
								{task.name}
							</div>
							{#if task.description}
								<div class="text-xs text-gray-500 truncate">
									{task.description}
								</div>
							{/if}
						</div>
					</button>
				{/each}
			{:else if !loading}
				<div class="px-4 py-3 text-sm text-gray-500 text-center">
					No tasks found.
				</div>
			{/if}
		</div>
	{/if}
</div>
