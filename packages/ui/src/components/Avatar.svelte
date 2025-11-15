<script lang="ts">
  interface Props {
    name: string;
    avatar?: string;
    color?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
  }

  let {
    name,
    avatar,
    color = '#3b82f6',
    size = 'md'
  }: Props = $props();

  const initials = $derived(
    name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  );

  const sizeClasses = {
    xs: 'w-5 h-5 text-xs',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base'
  };
</script>

<div
  class="avatar {sizeClasses[size]}"
  style="background-color: {color}"
  title={name}
>
  {#if avatar}
    <img src={avatar} alt={name} />
  {:else}
    <span>{initials}</span>
  {/if}
</div>

<style>
  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: white;
    font-weight: 600;
    overflow: hidden;
    flex-shrink: 0;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar span {
    font-size: inherit;
  }

  .w-5 { width: 1.25rem; }
  .h-5 { height: 1.25rem; }
  .w-6 { width: 1.5rem; }
  .h-6 { height: 1.5rem; }
  .w-8 { width: 2rem; }
  .h-8 { height: 2rem; }
  .w-12 { width: 3rem; }
  .h-12 { height: 3rem; }

  .text-xs { font-size: 0.625rem; }
  .text-sm { font-size: 0.75rem; }
  .text-base { font-size: 0.875rem; }
</style>
