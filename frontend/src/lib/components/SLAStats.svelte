<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';

  let overdueTasks = $state(0);
  let nearBreachTasks = $state(0);
  let slaBreachHistory = $state<any[]>([]);

  // Mock data for now since we don't have a dedicated stats endpoint yet
  // In a real implementation, we would fetch this from the backend
  function loadStats() {
    overdueTasks = Math.floor(Math.random() * 5);
    nearBreachTasks = Math.floor(Math.random() * 8);
    slaBreachHistory = [
      { date: '2023-01-01', count: 2 },
      { date: '2023-01-02', count: 0 },
      { date: '2023-01-03', count: 1 },
      { date: '2023-01-04', count: 3 },
      { date: '2023-01-05', count: 0 },
    ];
  }

  onMount(() => {
    loadStats();
    // Also trigger a check
    api.checkSLABreaches().catch(console.error);
  });
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-900">SLA Overview</h3>
    <button onclick={() => api.checkSLABreaches()} class="text-sm text-blue-600 hover:text-blue-800">
      Refresh Check
    </button>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="bg-red-50 p-4 rounded-lg border border-red-100">
      <div class="text-red-800 text-sm font-medium mb-1">Overdue Tasks</div>
      <div class="text-3xl font-bold text-red-600">{overdueTasks}</div>
      <div class="text-xs text-red-500 mt-1">Breached SLA</div>
    </div>

    <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
      <div class="text-yellow-800 text-sm font-medium mb-1">Warning Zone</div>
      <div class="text-3xl font-bold text-yellow-600">{nearBreachTasks}</div>
      <div class="text-xs text-yellow-500 mt-1">> 80% SLA time used</div>
    </div>

    <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
      <div class="text-blue-800 text-sm font-medium mb-1">Health Score</div>
      <div class="text-3xl font-bold text-blue-600">94%</div>
      <div class="text-xs text-blue-500 mt-1">Tasks within SLA</div>
    </div>
  </div>
</div>
