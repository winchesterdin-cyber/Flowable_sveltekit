<script lang="ts">
	/**
	 * Dashboard Skeleton Loader
	 * 
	 * Displays placeholder content while dashboard data is loading.
	 * Matches the structure of the actual dashboard for smooth transition.
	 */
</script>

<div class="max-w-7xl mx-auto px-4 py-8 animate-pulse">
	<!-- Header -->
	<div class="mb-8">
		<div class="h-8 bg-gray-200 rounded w-64 mb-2"></div>
		<div class="h-4 bg-gray-100 rounded w-96"></div>
	</div>

	<!-- SLA Stats Placeholder -->
	<div class="bg-white rounded-lg shadow p-6 mb-8">
		<div class="h-6 bg-gray-200 rounded w-32 mb-4"></div>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			{#each Array(4) as _}
				<div>
					<div class="h-8 bg-gray-100 rounded w-16 mb-2"></div>
					<div class="h-4 bg-gray-100 rounded w-24"></div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Stats Overview -->
	<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
		{#each Array(7) as _}
			<div class="bg-white rounded-lg shadow p-6">
				<div class="h-8 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
				<div class="h-3 bg-gray-100 rounded w-20 mx-auto"></div>
			</div>
		{/each}
	</div>

	<!-- Escalation Metrics Placeholder -->
	<div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
		<div class="h-5 bg-amber-200 rounded w-40 mb-3"></div>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			{#each Array(3) as _}
				<div>
					<div class="h-8 bg-amber-100 rounded w-16 mb-1"></div>
					<div class="h-4 bg-amber-100 rounded w-32"></div>
				</div>
			{/each}
			<div class="flex flex-wrap gap-2">
				{#each Array(3) as _}
					<div class="h-6 bg-amber-100 rounded w-16"></div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Analytics Widgets Placeholder -->
	<div class="mb-8 grid gap-6 lg:grid-cols-2">
		{#each Array(2) as _}
			<div class="bg-white rounded-lg shadow p-6">
				<div class="h-6 bg-gray-200 rounded w-48 mb-4"></div>
				<div class="h-64 bg-gray-100 rounded"></div>
			</div>
		{/each}
	</div>

	<!-- Bottleneck Widget Placeholder -->
	<div class="mb-8">
		<div class="bg-white rounded-lg shadow p-6">
			<div class="h-6 bg-gray-200 rounded w-48 mb-4"></div>
			<div class="h-48 bg-gray-100 rounded"></div>
		</div>
	</div>

	<!-- Process Type Distribution Placeholder -->
	<div class="bg-white rounded-lg shadow p-4 mb-8">
		<div class="h-5 bg-gray-200 rounded w-48 mb-3"></div>
		<div class="flex flex-wrap gap-3">
			{#each Array(5) as _}
				<div class="h-10 bg-gray-100 rounded w-32"></div>
			{/each}
		</div>
	</div>

	<!-- Tab Navigation Placeholder -->
	<div class="border-b border-gray-200 mb-6">
		<div class="flex space-x-8">
			{#each Array(4) as _}
				<div class="py-4">
					<div class="h-4 bg-gray-200 rounded w-32"></div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Filter Bar Placeholder -->
	<div class="flex gap-4 mb-4">
		<div class="h-10 bg-gray-100 rounded w-40"></div>
		<div class="ml-auto h-10 bg-blue-100 rounded w-24"></div>
	</div>

	<!-- Table Placeholder -->
	<div class="bg-white rounded-lg shadow overflow-hidden">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						{#each Array(8) as _}
							<th class="px-4 py-3">
								<div class="h-3 bg-gray-200 rounded w-20"></div>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#each Array(10) as _}
						<tr>
							{#each Array(8) as _}
								<td class="px-4 py-3">
									<div class="h-4 bg-gray-100 rounded w-full"></div>
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<style>
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
	
	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
