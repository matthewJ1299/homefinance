import type { FeatureKey } from "@/lib/features/registry";

export interface AdminHouseholdSummary {
  id: number;
  name: string;
  approvalStatus: "pending" | "active" | "rejected";
  memberCount: number;
  aiTier: "free" | "paid";
  enabledFeatureKeys: FeatureKey[];
  createdAt: string;
}

export interface AdminHouseholdDetail extends AdminHouseholdSummary {}

export interface IAdminHouseholdRepository {
  listHouseholds(): Promise<AdminHouseholdSummary[]>;
  getHousehold(householdId: number): Promise<AdminHouseholdDetail | null>;
  createHousehold(name: string, approvalStatus?: "pending" | "active" | "rejected"): Promise<number>;
  renameHousehold(householdId: number, name: string): Promise<void>;
  getAiTier(householdId: number): Promise<"free" | "paid">;
  setAiTier(householdId: number, tier: "free" | "paid"): Promise<void>;
  grantCoreFeatures(householdId: number, grantedByUserId: number): Promise<void>;
}
