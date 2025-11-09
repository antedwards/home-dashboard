import type { SyncOperation } from './types';

export class SyncQueue {
  private operations: Map<string, SyncOperation> = new Map();

  constructor(
    private options: {
      maxRetries: number;
    }
  ) {}

  enqueue(
    operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'>
  ): SyncOperation {
    const op: SyncOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
    };

    this.operations.set(op.id, op);
    this.persist();
    return op;
  }

  getPending(limit?: number): SyncOperation[] {
    const pending = Array.from(this.operations.values())
      .filter((op) => op.retries < this.options.maxRetries)
      .sort((a, b) => a.timestamp - b.timestamp);

    return limit ? pending.slice(0, limit) : pending;
  }

  getPendingCount(): number {
    return Array.from(this.operations.values()).filter(
      (op) => op.retries < this.options.maxRetries
    ).length;
  }

  remove(id: string): void {
    this.operations.delete(id);
    this.persist();
  }

  incrementRetries(id: string): void {
    const op = this.operations.get(id);
    if (op) {
      op.retries++;
      this.persist();
    }
  }

  clear(): void {
    this.operations.clear();
    this.persist();
  }

  private persist(): void {
    // Persist to localStorage in browser, or to file in Electron
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        'sync-queue',
        JSON.stringify(Array.from(this.operations.entries()))
      );
    }
  }

  restore(): void {
    // Restore from localStorage in browser, or from file in Electron
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('sync-queue');
      if (stored) {
        try {
          const entries = JSON.parse(stored);
          this.operations = new Map(entries);
        } catch (error) {
          console.error('Failed to restore sync queue:', error);
        }
      }
    }
  }
}
