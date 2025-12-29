<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils';

  interface Props extends HTMLTextareaAttributes {
    class?: string;
    value?: string;
  }

  // eslint-disable-next-line svelte/valid-compile, prefer-const
  let { class: className, value = $bindable(''), ...restProps }: Props = $props();
</script>

<textarea
  class={cn(
    'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
    className
  )}
  bind:value
  {...restProps}
></textarea>
