import { formatRand } from "@/lib/utils/currency";
import type { NotificationPayload } from "@/lib/services/notification.service";

export interface SplitParticipant {
  userId: number;
  shareMinor: number;
}

/**
 * Who gets told about a shared spend: everyone in the split except the person
 * who saved it, and only those who actually carry a share. The adder already
 * knows, and a zero-share "participant" was not really in on it -- telling
 * them "your share is R0.00" would be noise on the lock screen.
 */
export function splitPushRecipients(
  adderUserId: number,
  participants: SplitParticipant[]
): SplitParticipant[] {
  return participants.filter((p) => p.userId !== adderUserId && p.shareMinor > 0);
}

/**
 * The push for one recipient of a shared spend. Personalised with *their*
 * share: "R450" means nothing until you know your half is R225. `kind: "split"`
 * is what gets it past the beta push gate in NotificationService.
 */
export function splitAddedPayload(input: {
  adderName: string;
  amountMinor: number;
  note: string | null | undefined;
  shareMinor: number;
}): NotificationPayload {
  const note = input.note?.trim();
  const what = note ? note : "a shared spend";
  return {
    title: "HomeFinance",
    body: `${input.adderName} added ${what} (${formatRand(input.amountMinor)}) — your share is ${formatRand(input.shareMinor)}`,
    url: "/splits",
    kind: "split",
  };
}
