import { z } from "zod";

/** Optional account id: accepts number or numeric string (e.g. JSON from BIGINT). */
export const optionalCoercedAccountId = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : val;
}, z.number().int().positive().optional());
