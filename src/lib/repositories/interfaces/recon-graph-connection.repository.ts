export interface ReconGraphConnectionRow {
  userId: number;
  refreshTokenEncrypted: string;
  msAccountEmail: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IReconGraphConnectionRepository {
  upsert(userId: number, refreshTokenEncrypted: string, msAccountEmail: string | null): Promise<void>;
  findByUserId(userId: number): Promise<ReconGraphConnectionRow | null>;
  deleteByUserId(userId: number): Promise<void>;
  setLastSyncedAt(userId: number, lastSyncedAt: Date): Promise<void>;
}
