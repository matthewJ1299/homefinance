/**
 * A household member as the UI needs them: an id to attribute a share to and a
 * name to show. Passed wherever the old code passed a single `otherUserName`,
 * which only ever described a household of two.
 */
export interface HouseholdMember {
  id: number;
  name: string;
}

/**
 * The name to show when a surface still speaks of "the other person".
 *
 * With one housemate that is unambiguous. With several there is no such person,
 * so this returns undefined and the caller falls back to neutral wording rather
 * than naming whoever happened to be first.
 */
export function soleOtherMemberName(members: HouseholdMember[]): string | undefined {
  return members.length === 1 ? members[0].name : undefined;
}
