<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils';
  import { buttonVariants, type Variant, type Size } from './index';

  interface Props extends HTMLButtonAttributes {
    variant?: Variant;
    size?: Size;
    children?: Snippet;
    class?: string;
  }

  const {
    class: className,
    variant = 'default',
    size = 'default',
    children,
    type = 'button',
    disabled,
    onclick,
    ...restProps // eslint-disable-line svelte/valid-compile
  }: Props = $props();
</script>

<button
  class={cn(buttonVariants({ variant, size }), className)}
  {type}
  {disabled}
  {onclick}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}
</button>
