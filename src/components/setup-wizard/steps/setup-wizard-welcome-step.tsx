"use client";

export function SetupWizardWelcomeStep() {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">Welcome</p>
      <p className="text-muted-foreground">
        This wizard helps you configure the essentials and optionally enable features like AI analysis and Recon. You
        can re-run it any time from Settings.
      </p>
    </div>
  );
}

