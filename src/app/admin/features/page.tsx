import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminFeaturesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Features</h1>
        <p className="text-sm text-muted-foreground">
          Feature access is managed as policy (per house) plus opt-in (per user).
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <div className="font-medium">Where to manage it</div>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            House-level policy (recommended):{" "}
            <Link className="text-foreground underline" href="/admin/houses">
              Houses
            </Link>
          </li>
          <li>
            User-level overrides (current app gating):{" "}
            <Link className="text-foreground underline" href="/admin/users">
              Users
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

