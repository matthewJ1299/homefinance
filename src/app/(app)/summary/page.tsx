import { redirect } from "next/navigation";

/** Summary is Reports now. Kept as a redirect so existing links still land. */
export default function SummaryPage() {
  redirect("/reports");
}
