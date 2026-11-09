export type DownloadExportResult = "ok" | "unauthorized" | "failed";

/**
 * Fetches an export route and hands the response to the browser as a download,
 * honouring the filename the server put in Content-Disposition.
 */
export async function downloadExport(
  path: string,
  fallbackFilename: string
): Promise<DownloadExportResult> {
  const res = await fetch(path, { method: "GET", credentials: "include" });
  if (!res.ok) return res.status === 401 ? "unauthorized" : "failed";

  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  const match = cd?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? fallbackFilename;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "ok";
}
