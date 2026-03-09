export interface PushSubscriptionRecord {
  id: number;
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

export interface CreatePushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface IPushSubscriptionRepository {
  create(userId: number, data: CreatePushSubscriptionInput): Promise<{ id: number }>;
  findByUserId(userId: number): Promise<PushSubscriptionRecord[]>;
  deleteByEndpoint(endpoint: string): Promise<void>;
  deleteByEndpointAndUserId(endpoint: string, userId: number): Promise<void>;
}
