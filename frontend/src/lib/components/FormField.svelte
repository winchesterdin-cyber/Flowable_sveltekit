<script lang="ts">
	import type { Snippet } from 'svelte';
	import { CheckCircle2, AlertCircle, HelpCircle } from '@lucide/svelte';

	interface Props {
		/** Field name/id */
		name: string;
		/** Field label */
		label: string;
		/** Whether the field is required */
		required?: boolean;
		/** Error message (if any) */
		error?: string;
		/** Help text shown below the field */
		helpText?: string;
		/** Tooltip shown on hover of the help icon */
		tooltip?: string;
		/** Whether the field has been touched */
		touched?: boolean;
		/** Whether to show success state when valid and touched */
		showSuccess?: boolean;
		/** Whether the field is disabled */
		disabled?: boolean;
		/** Additional CSS classes for the container */
		class?: string;
		/** The field input content */
		children: Snippet;
	}

	const {
		name,
		label,
		required = false,
		error,
		helpText,
		tooltip,
		touched = false,
		showSuccess = true,
		disabled = false,
		class: className = '',
		children
	}: Props = $props();

	const hasError = $derived(!!error && touched);
	const isValid = $derived(!error && touched && showSuccess);

	const fieldId = $derived(`field-${name}`);

	// Determine border color based on state
	const borderClass = $derived(
		hasError
			? 'border-red-500 focus-within:ring-red-500'
			: isValid
				? 'border-green-500 focus-within:ring-green-500'
				: 'border-gray-300 focus-within:ring-blue-500'
	);
</script>

<div class="form-field-wrapper {className}" class:opacity-50={disabled}>
	<!-- Label Row -->
	<div class="flex items-center justify-between mb-1">
		<label
			for={fieldId}
			class="block text-sm font-medium text-gray-700"
		>
			{label}
			{#if required}
				<span class="text-red-500 ml-0.5" aria-hidden="true">*</span>
				<span class="sr-only">(required)</span>
			{/if}
		</label>

		{#if tooltip}
			<button
				type="button"
				class="text-gray-400 hover:text-gray-600 focus:outline-none"
				title={tooltip}
				aria-label="Help for {label}"
			>
				<HelpCircle class="w-4 h-4" />
			</button>
		{/if}
	</div>

	<!-- Input Container with validation icons -->
	<div class="relative">
		<div
			class="field-input-container rounded-md border {borderClass} focus-within:ring-2 transition-colors"
			class:bg-gray-50={disabled}
		>
			{@render children()}
		</div>

		<!-- Validation Icon -->
		{#if hasError || isValid}
			<div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
				{#if hasError}
					<AlertCircle class="w-5 h-5 text-red-500" aria-hidden="true" />
				{:else if isValid}
					<CheckCircle2 class="w-5 h-5 text-green-500" aria-hidden="true" />
				{/if}
			</div>
		{/if}
	</div>

	<!-- Help Text / Error Message -->
	<div class="mt-1 min-h-[1.25rem]">
		{#if hasError}
			<p
				class="text-sm text-red-600 flex items-center gap-1"
				id="{fieldId}-error"
				role="alert"
			>
				{error}
			</p>
		{:else if helpText}
			<p class="text-sm text-gray-500" id="{fieldId}-help">
				{helpText}
			</p>
		{/if}
	</div>
</div>

<style>
	.form-field-wrapper {
		margin-bottom: 1rem;
	}

	/* Remove default input borders when inside the container */
	.field-input-container :global(input),
	.field-input-container :global(select),
	.field-input-container :global(textarea) {
		border: none;
		outline: none;
		box-shadow: none;
		background: transparent;
	}

	.field-input-container :global(input:focus),
	.field-input-container :global(select:focus),
	.field-input-container :global(textarea:focus) {
		outline: none;
		box-shadow: none;
	}

	/* Add padding for validation icon */
	.field-input-container :global(input),
	.field-input-container :global(select) {
		padding-right: 2.5rem;
	}
</style>
