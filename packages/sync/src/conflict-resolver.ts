import type { ConflictResolution } from './types';

export class ConflictResolver {
  private strategies: Map<string, ConflictResolution> = new Map();

  constructor() {
    // Register default strategies
    this.registerStrategy('last-write-wins', {
      strategy: 'last-write-wins',
      resolve: (local, remote) => {
        const localTime = new Date(local.updated_at || local.created_at).getTime();
        const remoteTime = new Date(remote.updated_at || remote.created_at).getTime();
        return remoteTime > localTime ? remote : local;
      },
    });

    this.registerStrategy('local-wins', {
      strategy: 'local-wins',
      resolve: (local, _remote) => local,
    });

    this.registerStrategy('remote-wins', {
      strategy: 'remote-wins',
      resolve: (_local, remote) => remote,
    });
  }

  registerStrategy(name: string, resolution: ConflictResolution): void {
    this.strategies.set(name, resolution);
  }

  resolve(strategyName: string, local: any, remote: any): any {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown conflict resolution strategy: ${strategyName}`);
    }
    return strategy.resolve(local, remote);
  }

  detectConflict(local: any, remote: any): boolean {
    // Simple conflict detection based on timestamps
    if (!local || !remote) return false;

    const localTime = new Date(local.updated_at || local.created_at).getTime();
    const remoteTime = new Date(remote.updated_at || remote.created_at).getTime();

    // If both were modified around the same time (within 1 second), it's a conflict
    return Math.abs(localTime - remoteTime) < 1000;
  }
}
