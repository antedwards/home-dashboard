export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export type OperationType = 'insert' | 'update' | 'delete';

export interface SyncOperation {
  id: string;
  type: OperationType;
  table: string;
  data: any;
  timestamp: number;
  retries: number;
}

export interface SyncState {
  status: SyncStatus;
  lastSync: number | null;
  pendingOperations: number;
  error: string | null;
}

export interface ConflictResolution {
  strategy: 'local-wins' | 'remote-wins' | 'last-write-wins' | 'manual';
  resolve: (local: any, remote: any) => any;
}
