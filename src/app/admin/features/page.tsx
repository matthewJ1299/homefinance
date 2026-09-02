import { FEATURE_LIST } from "@/lib/features/registry";
import { isFeatureServerConfigured } from "@/lib/features/server-config";
import { getHouseholdFeatureRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminFeaturesPage() {
  const grants = await getHouseholdFeatureRepository().listAllGrants();
  const counts = new Map<string, number>();
  for (const g of grants) {
    if (g.enabled) {
      counts.set(g.featureKey, (counts.get(g.featureKey) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Features</h1>
        <p className="text-sm text-muted-foreground">
          Sellable features in the catalogue and how many households have each enabled.
        </p>
      </div>

      <section className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b">
            <tr>
              <th className="text-left p-3">Feature</th>
              <th className="text-left p-3">Households enabled</th>
              <th className="text-left p-3">Server configured</th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_LIST.map((f) => (
              <tr key={f.key} className="border-b last:border-b-0">
                <td className="p-3">
                  <div className="font-medium">{f.label}</div>
                  <div className="text-muted-foreground">{f.description}</div>
                </td>
                <td className="p-3">{counts.get(f.key) ?? 0}</td>
                <td className="p-3">
                  {f.serverConfig === "ai_keys"
                    ? isFeatureServerConfigured(f.key, "free") ||
                      isFeatureServerConfigured(f.key, "paid")
                      ? "Yes"
                      : "No"
                    : isFeatureServerConfigured(f.key, "free")
                      ? "Yes"
                      : "No"}
                  {f.serverConfigHint ? (
                    <div className="text-xs text-muted-foreground mt-1">{f.serverConfigHint}</div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
