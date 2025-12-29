<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  interface Props {
    class?: string;
    children?: Snippet;
  }

  const { class: className, children }: Props = $props();
</script>

<DialogPrimitive.Description class={cn('text-muted-foreground text-sm', className)}>
  {#if children}
    {@render children()}
  {/if}
</DialogPrimitive.Description>
