<script lang="ts">
	import type { Task } from '$lib/types';
	import { BarChart3, AlertTriangle, Clock3, AlarmClockCheck, UserMinus, Flame } from '@lucide/svelte';
	import {
		buildTaskInsightMetrics,
		type InsightFilter
	} from '$lib/utils/task-insights';

	interface InsightCard {
		id: InsightFilter;
		label: string;
		description: string;
		color: string;
		icon: typeof BarChart3;
		count: number;
	}

	interface Props {
		tasks: Task[];
		activeInsight: InsightFilter;
		loading?: boolean;
		onInsightChange: (insight: InsightFilter) => void;
	}

	const { tasks, activeInsight, loading = false, onInsightChange }: Props = $props();

	const metrics = $derived(buildTaskInsightMetrics(tasks));

	const insightCards = $derived<InsightCard[]>([
		{
			id: 'all',
			label: 'Total tasks',
			description: 'Everything matching your current filters.',
			color: 'text-blue-700 bg-blue-50 border-blue-200',
			icon: BarChart3,
			count: metrics.total
		},
		{
			id: 'unassigned',
			label: 'Unassigned',
			description: 'Tasks that still need an owner.',
			color: 'text-orange-700 bg-orange-50 border-orange-200',
			icon: UserMinus,
			count: metrics.unassigned
		},
		{
			id: 'overdue',
			label: 'Overdue',
			description: 'Tasks past their due date.',
			color: 'text-red-700 bg-red-50 border-red-200',
			icon: AlertTriangle,
			count: metrics.overdue
		},
		{
			id: 'dueToday',
			label: 'Due today',
			description: 'Tasks that must be completed today.',
			color: 'text-amber-700 bg-amber-50 border-amber-200',
			icon: AlarmClockCheck,
			count: metrics.dueToday
		},
		{
			id: 'dueSoon',
			label: 'Due soon',
			description: 'Tasks due within the next 48 hours.',
			color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
			icon: Clock3,
			count: metrics.dueSoon
		},
		{
			id: 'highPriority',
			label: 'High priority',
			description: 'Priority 75+ tasks that need focus.',
			color: 'text-purple-700 bg-purple-50 border-purple-200',
			icon: Flame,
			count: metrics.highPriority
		}
	]);
</script>

<section
	class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6"
	aria-label="Task insights"
>
	<div class="flex flex-col gap-2 mb-4">
		<h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Task insights</h2>
		<p class="text-sm text-gray-500">
			{#if loading}
				Refreshing counts...
			{:else}
				Use these quick filters to focus your task list.
			{/if}
		</p>
	</div>

	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each insightCards as insight (insight.id)}
			<button
				type="button"
				onclick={() => onInsightChange(insight.id)}
				disabled={loading}
				aria-pressed={activeInsight === insight.id}
				class="border rounded-lg p-4 text-left transition-all hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed {insight.color} {activeInsight === insight.id ? 'ring-2 ring-blue-500 border-blue-400' : ''}"
			>
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium">{insight.label}</p>
						<p class="mt-1 text-xs text-gray-500">{insight.description}</p>
					</div>
					<insight.icon class="w-5 h-5" aria-hidden="true" />
				</div>
				<p class="mt-3 text-2xl font-semibold">{insight.count}</p>
			</button>
		{/each}
	</div>

	{#if !loading && metrics.total === 0}
		<p class="mt-4 text-xs text-gray-500" aria-live="polite">
			No tasks match the current filters yet. Try clearing filters or starting a new workflow.
		</p>
	{/if}
</section>
