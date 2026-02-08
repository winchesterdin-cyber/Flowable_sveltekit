<script lang="ts">
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';

  const { currentPage, totalPages, onPageChange } = $props();

  const handlePageChange = (page: number) => {
    if (page >= 0 && page < totalPages) {
      onPageChange(page);
    }
  };
</script>

<nav class="flex items-center justify-center space-x-2" aria-label="Pagination">
  <button
    type="button"
    class="px-3 py-1 border rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
    disabled={currentPage === 0}
    aria-disabled={currentPage === 0}
    onclick={() => handlePageChange(currentPage - 1)}
    aria-label="Previous page"
  >
    <ChevronLeft class="w-4 h-4 mr-1" />
    <span>Previous</span>
  </button>
  <span class="text-sm text-gray-700" aria-live="polite">
    Page {currentPage + 1} of {totalPages}
  </span>
  <span class="sr-only" role="status" aria-live="polite">
    Page {currentPage + 1} of {totalPages}
  </span>
  <button
    type="button"
    class="px-3 py-1 border rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
    disabled={currentPage === totalPages - 1}
    aria-disabled={currentPage === totalPages - 1}
    onclick={() => handlePageChange(currentPage + 1)}
    aria-label="Next page"
  >
    <span>Next</span>
    <ChevronRight class="w-4 h-4 ml-1" />
  </button>
</nav>
