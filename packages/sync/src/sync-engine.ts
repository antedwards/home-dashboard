import type { SupabaseClient } from '@home-dashboard/database';
import type { SyncOperation, SyncState, SyncStatus } from './types';
import { SyncQueue } from './queue';

export class SyncEngine {
  private queue: SyncQueue;
  private status: SyncStatus = 'idle';
  private syncInterval?: NodeJS.Timeout;
  private listeners: Set<(state: SyncState) => void> = new Set();

  constructor(
    private client: SupabaseClient,
    private options: {
      syncIntervalMs?: number;
      maxRetries?: number;
      batchSize?: number;
    } = {}
  ) {
    this.queue = new SyncQueue({
      maxRetries: options.maxRetries || 3,
    });

    // Listen for network status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  async start() {
    const intervalMs = this.options.syncIntervalMs || 5000;
    this.syncInterval = setInterval(() => this.sync(), intervalMs);
    await this.sync();
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  async enqueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'>) {
    const op = this.queue.enqueue(operation);
    this.notifyListeners();

    // Try to sync immediately if online
    if (this.isOnline()) {
      await this.sync();
    }

    return op;
  }

  private async sync() {
    if (this.status === 'syncing' || !this.isOnline()) {
      return;
    }

    this.status = 'syncing';
    this.notifyListeners();

    try {
      const operations = this.queue.getPending(this.options.batchSize || 10);

      for (const op of operations) {
        try {
          await this.executeOperation(op);
          this.queue.remove(op.id);
        } catch (error) {
          console.error('Sync operation failed:', error);
          this.queue.incrementRetries(op.id);

          if (op.retries >= (this.options.maxRetries || 3)) {
            console.error('Max retries reached for operation:', op);
            this.queue.remove(op.id); // Remove failed operation after max retries
          }
        }
      }

      this.status = 'idle';
    } catch (error) {
      this.status = 'error';
      console.error('Sync error:', error);
    }

    this.notifyListeners();
  }

  private async executeOperation(op: SyncOperation): Promise<void> {
    switch (op.type) {
      case 'insert':
        await this.client.from(op.table).insert(op.data);
        break;
      case 'update':
        await this.client.from(op.table).update(op.data).eq('id', op.data.id);
        break;
      case 'delete':
        await this.client.from(op.table).delete().eq('id', op.data.id);
        break;
    }
  }

  private isOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine;
  }

  private handleOnline() {
    this.status = 'idle';
    this.notifyListeners();
    this.sync();
  }

  private handleOffline() {
    this.status = 'offline';
    this.notifyListeners();
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  private getState(): SyncState {
    return {
      status: this.status,
      lastSync: Date.now(),
      pendingOperations: this.queue.getPendingCount(),
      error: null,
    };
  }

  getPendingCount(): number {
    return this.queue.getPendingCount();
  }
}
