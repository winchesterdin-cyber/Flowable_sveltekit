<script lang="ts">
	import { AlertTriangle, Trash2, Info, AlertCircle } from '@lucide/svelte';

	type DialogVariant = 'danger' | 'warning' | 'info';

	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		variant?: DialogVariant;
		loading?: boolean;
		onConfirm: () => void | Promise<void>;
		onCancel: () => void;
	}

	const {
		open,
		title,
		message,
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		variant = 'danger',
		loading = false,
		onConfirm,
		onCancel
	}: Props = $props();

	const variantConfig = {
		danger: {
			icon: Trash2,
			iconBg: 'bg-red-100',
			iconColor: 'text-red-600',
			buttonBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
			buttonText: 'text-white'
		},
		warning: {
			icon: AlertTriangle,
			iconBg: 'bg-yellow-100',
			iconColor: 'text-yellow-600',
			buttonBg: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
			buttonText: 'text-white'
		},
		info: {
			icon: Info,
			iconBg: 'bg-blue-100',
			iconColor: 'text-blue-600',
			buttonBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
			buttonText: 'text-white'
		}
	};

	const config = $derived(variantConfig[variant]);
	const IconComponent = $derived(config.icon);

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !loading) {
			onCancel();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !loading) {
			onCancel();
		}
	}

	async function handleConfirm() {
		await onConfirm();
	}
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn"
		onclick={handleBackdropClick}
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="confirm-dialog-title"
		aria-describedby="confirm-dialog-message"
		tabindex="-1"
	>
		<div
			class="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all animate-slideIn"
			role="document"
		>
			<div class="p-6">
				<div class="flex items-start gap-4">
					<!-- Icon -->
					<div class="flex-shrink-0">
						<div class="w-10 h-10 rounded-full {config.iconBg} flex items-center justify-center">
							<IconComponent class="w-5 h-5 {config.iconColor}" />
						</div>
					</div>

					<!-- Content -->
					<div class="flex-1 min-w-0">
						<h3
							id="confirm-dialog-title"
							class="text-lg font-semibold text-gray-900"
						>
							{title}
						</h3>
						<p
							id="confirm-dialog-message"
							class="mt-2 text-sm text-gray-600"
						>
							{message}
						</p>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
				<button
					type="button"
					onclick={onCancel}
					disabled={loading}
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{cancelText}
				</button>
				<button
					type="button"
					onclick={handleConfirm}
					disabled={loading}
					class="px-4 py-2 text-sm font-medium {config.buttonText} {config.buttonBg} rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
				>
					{#if loading}
						<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
					{/if}
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(-10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.animate-fadeIn {
		animation: fadeIn 0.15s ease-out;
	}

	.animate-slideIn {
		animation: slideIn 0.2s ease-out;
	}
</style>
