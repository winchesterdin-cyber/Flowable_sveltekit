<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui';

  interface Props {
    placeholder?: string;
  }

  const { placeholder }: Props = $props();
</script>

<SelectPrimitive.Value {placeholder} />
