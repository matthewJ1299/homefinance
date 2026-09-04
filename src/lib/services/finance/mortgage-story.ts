import { formatRand } from "@/lib/utils/currency";

export type StoryCase = "equal-no-deposit" | "equal-with-deposit" | "unequal-to-target";

export interface StoryPerson {
  userId: number;
  name: string;
  depositMinor: number;
  monthlyMinor: number;
  /** Where their ownership lands at term end, in basis points. */
  projectedShareBp: number;
}

export interface StoryInput {
  people: StoryPerson[];
  /** Month the bond finishes, e.g. "March 2044". */
  levelOutLabel?: string;
}

export interface StorySection {
  title: string;
  body: string;
}

const BP = 10_000;
/** Payments within 2% of each other read as "the same" to a person. */
const EQUAL_TOLERANCE_BP = 200;

function pct(bp: number): string {
  return `${Math.round(bp / 100)}%`;
}

/**
 * Which of the three stories applies. Deterministic, from the numbers alone --
 * no thresholds that need tuning and no model in the loop.
 */
export function pickCase(people: StoryPerson[]): StoryCase {
  const anyDeposit = people.some((p) => p.depositMinor > 0);
  const total = people.reduce((s, p) => s + p.monthlyMinor, 0);
  const evenShare = total / Math.max(1, people.length);
  const paymentsEqual = people.every(
    (p) => Math.abs((p.monthlyMinor - evenShare) / Math.max(1, total)) * BP < EQUAL_TOLERANCE_BP
  );

  if (!anyDeposit && paymentsEqual) return "equal-no-deposit";
  if (anyDeposit && paymentsEqual) return "equal-with-deposit";
  return "unequal-to-target";
}

/**
 * Three templates, chosen deterministically and unit-testable.
 *
 * Deliberately not generated: an explanation of someone's home equity that
 * varies between reads, cannot be tested, and might invent a number is the
 * wrong tool for this screen.
 */
export function buildStory(input: StoryInput): StorySection[] {
  const people = [...input.people].sort((a, b) => b.depositMinor - a.depositMinor);
  if (people.length === 0) return [];

  const kind = pickCase(people);
  const [first, second] = people;
  const level = input.levelOutLabel ? ` by ${input.levelOutLabel}` : "";

  if (kind === "equal-no-deposit") {
    return [
      {
        title: "You each own half",
        body:
          "Nobody put money in up front and you pay the same each month, so your shares stay equal the whole way through. Nothing to balance.",
      },
    ];
  }

  if (kind === "equal-with-deposit" && second) {
    return [
      {
        title: `${first.name}'s deposit is doing the work`,
        body: `${first.name} put in ${formatRand(first.depositMinor)} up front and you pay the same amount each month, so ${first.name} stays ahead: ${pct(first.projectedShareBp)} against ${pct(second.projectedShareBp)} at the end.`,
      },
      {
        title: "The fix, if you want one",
        body: `Paying uneven amounts each month would even the shares out${level}. It is only worth doing if the split matters to you -- the house is the same house either way.`,
      },
    ];
  }

  if (!second) {
    return [
      {
        title: "It is all yours",
        body: `You put in ${formatRand(first.depositMinor)} and you pay ${formatRand(first.monthlyMinor)} a month. Every rand of it is your share.`,
      },
    ];
  }

  // unequal-to-target: the closing line is the one that does the work.
  const evenSplitOwner =
    first.depositMinor > second.depositMinor ? first : second;
  const evenSplitBp =
    BP / 2 +
    Math.round(
      ((evenSplitOwner.depositMinor -
        people.reduce((s, p) => s + p.depositMinor, 0) / people.length) /
        Math.max(1, people.reduce((s, p) => s + p.depositMinor, 0))) *
        (BP / 2)
    );

  return [
    {
      title: "Why the payments are uneven",
      body: `${first.name} put in ${formatRand(first.depositMinor)} up front, so ${second.name} pays more each month -- ${formatRand(second.monthlyMinor)} against ${formatRand(first.monthlyMinor)} -- to catch up.`,
    },
    {
      title: "Where it lands",
      body: `At the end you own ${pct(first.projectedShareBp)} and ${pct(second.projectedShareBp)}${level}. The percentage moves every month, which is why it looks different each time you look.`,
    },
    {
      title: "The point of it",
      body: `If you'd both paid half and half, ${evenSplitOwner.name} would end up owning ${pct(Math.min(BP, Math.max(0, evenSplitBp)))} because of the deposit. The uneven split is what makes it fair.`,
    },
  ];
}
