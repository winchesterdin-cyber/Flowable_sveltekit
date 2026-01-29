<script lang="ts">
	import { AlertCircle, X } from '@lucide/svelte';

	interface Props {
		errors: Record<string, string>;
		title?: string;
		dismissable?: boolean;
		onDismiss?: () => void;
		/** Map of field names to labels for better error messages */
		fieldLabels?: Record<string, string>;
	}

	const {
		errors,
		title = 'Please fix the following errors:',
		dismissable = false,
		onDismiss,
		fieldLabels = {}
	}: Props = $props();

	const errorEntries = $derived(Object.entries(errors));
	const hasErrors = $derived(errorEntries.length > 0);

	function getFieldLabel(fieldName: string): string {
		return fieldLabels[fieldName] || formatFieldName(fieldName);
	}

	function formatFieldName(name: string): string {
		// Convert camelCase or snake_case to Title Case
		return name
			.replace(/([A-Z])/g, ' $1')
			.replace(/_/g, ' ')
			.replace(/^\w/, c => c.toUpperCase())
			.trim();
	}

	function scrollToField(fieldName: string) {
		const element = document.getElementById(`field-${fieldName}`) 
			|| document.querySelector(`[name="${fieldName}"]`)
			|| document.querySelector(`#${fieldName}`);
		
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'center' });
			// Focus the element if it's focusable
			if (element instanceof HTMLElement && 'focus' in element) {
				setTimeout(() => (element as HTMLElement).focus(), 300);
			}
		}
	}
</script>

{#if hasErrors}
	<div
		class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 animate-shake"
		role="alert"
		aria-live="polite"
	>
		<div class="flex items-start gap-3">
			<div class="flex-shrink-0">
				<AlertCircle class="w-5 h-5 text-red-500" />
			</div>
			<div class="flex-1 min-w-0">
				<h4 class="text-sm font-medium text-red-800">
					{title}
				</h4>
				<ul class="mt-2 space-y-1">
					{#each errorEntries as [fieldName, message]}
						<li class="text-sm text-red-700">
							<button
								type="button"
								onclick={() => scrollToField(fieldName)}
								class="hover:underline text-left focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded"
							>
								<span class="font-medium">{getFieldLabel(fieldName)}:</span>
								{message}
							</button>
						</li>
					{/each}
				</ul>
			</div>
			{#if dismissable && onDismiss}
				<button
					type="button"
					onclick={onDismiss}
					class="flex-shrink-0 text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
					aria-label="Dismiss errors"
				>
					<X class="w-5 h-5" />
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	@keyframes shake {
		0%, 100% {
			transform: translateX(0);
		}
		10%, 30%, 50%, 70%, 90% {
			transform: translateX(-2px);
		}
		20%, 40%, 60%, 80% {
			transform: translateX(2px);
		}
	}

	.animate-shake {
		animation: shake 0.5s ease-in-out;
	}
</style>
