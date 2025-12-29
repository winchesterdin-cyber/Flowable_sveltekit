import Root from './alert.svelte';
import Description from './alert-description.svelte';
import Title from './alert-title.svelte';
import { tv, type VariantProps } from 'tailwind-variants';

export const alertVariants = tv({
  base: '[&>svg]:text-foreground relative w-full rounded-lg border p-4 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&:has(svg)]:pl-11',
  variants: {
    variant: {
      default: 'bg-background text-foreground',
      destructive:
        'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

export type Variant = VariantProps<typeof alertVariants>['variant'];

export {
  Root,
  Description,
  Title,
  Root as Alert,
  Description as AlertDescription,
  Title as AlertTitle,
  type Variant as AlertVariant
};
