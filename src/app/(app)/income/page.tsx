import { redirect } from "next/navigation";

/**
 * Income is part of Transactions now, not a page of its own -- money in and
 * money out belong in one list. The redirect keeps existing links, the nav item
 * and any PWA shortcuts working; adding income is the Add sheet's Income tab.
 */
export default function IncomePage() {
  redirect("/expenses?type=income");
}
