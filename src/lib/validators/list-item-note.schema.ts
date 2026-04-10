import { z } from "zod";

export const listItemNoteBodySchema = z
  .string()
  .max(8000)
  .transform((s) => s.replace(/\r\n/g, "\n"));
