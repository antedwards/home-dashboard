<script lang="ts">
  import Avatar from './Avatar.svelte';
  import type { User } from '../types';

  interface Props {
    users: User[];
    max?: number;
    size?: 'xs' | 'sm' | 'md' | 'lg';
  }

  let {
    users = [],
    max = 3,
    size = 'sm'
  }: Props = $props();

  const displayedUsers = $derived(users.slice(0, max));
  const remainingCount = $derived(Math.max(0, users.length - max));
</script>

<div class="avatar-group {size}">
  {#each displayedUsers as user, index (user.id)}
    <div class="avatar-wrapper" style="z-index: {displayedUsers.length - index}">
      <Avatar
        name={user.name}
        avatar={user.avatar}
        color={user.color}
        {size}
      />
    </div>
  {/each}
  {#if remainingCount > 0}
    <div class="avatar-wrapper remaining" style="z-index: 0">
      <div class="avatar-more {size}">
        <span>+{remainingCount}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .avatar-group {
    display: inline-flex;
    align-items: center;
    flex-direction: row-reverse;
    justify-content: flex-end;
  }

  .avatar-wrapper {
    position: relative;
  }

  .avatar-wrapper:not(:last-child) {
    margin-left: -0.375rem;
  }

  .avatar-wrapper :global(.avatar) {
    border: 2px solid white;
  }

  .avatar-more {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: #e5e7eb;
    color: #6b7280;
    font-weight: 600;
    border: 2px solid white;
  }

  .avatar-more.xs {
    width: 1.25rem;
    height: 1.25rem;
    font-size: 0.5rem;
  }

  .avatar-more.sm {
    width: 1.5rem;
    height: 1.5rem;
    font-size: 0.625rem;
  }

  .avatar-more.md {
    width: 2rem;
    height: 2rem;
    font-size: 0.75rem;
  }

  .avatar-more.lg {
    width: 3rem;
    height: 3rem;
    font-size: 0.875rem;
  }
</style>
