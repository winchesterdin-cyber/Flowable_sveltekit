<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    orientation?: 'horizontal' | 'vertical';
    decorative?: boolean;
    class?: string;
  }

  const {
    class: className,
    orientation = 'horizontal',
    decorative = true,
    ...restProps // eslint-disable-line svelte/valid-compile
  }: Props = $props();
</script>

<div
  role={decorative ? 'none' : 'separator'}
  aria-orientation={orientation}
  class={cn(
    'bg-border shrink-0',
    orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
    className
  )}
  {...restProps}
></div>
