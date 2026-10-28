import { ChangePasswordForm } from "@/components/settings/change-password-form";

interface ProfileSettingsProps {
  name: string;
  email: string;
}

export function ProfileSettings({ name, email }: ProfileSettingsProps) {
  return (
    <section className="rounded-lg border bg-card p-4 space-y-4">
      <div>
        <h2 className="text-sm font-medium">Profile</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Your sign-in identity. Contact an administrator to change your email or household.
        </p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium">{name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium">{email}</dd>
        </div>
      </dl>
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-3">Change password</h3>
        <ChangePasswordForm showTitle={false} />
      </div>
    </section>
  );
}
