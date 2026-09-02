import { z } from "zod";

export const createHouseholdSchema = z.object({
  name: z.string().trim().min(1, "Household name is required").max(120),
});

export const createHouseholdWithOwnerSchema = z.object({
  householdName: z.string().trim().min(1, "Household name is required").max(120),
  ownerName: z.string().trim().min(1, "Owner name is required").max(120),
  ownerEmail: z.string().trim().email("Valid email required"),
  ownerPassword: z.string().min(10, "Password must be at least 10 characters"),
});

export const createUserInHouseholdSchema = z.object({
  householdId: z.number().int().positive(),
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Valid email required"),
  password: z.string().min(10, "Password must be at least 10 characters"),
});

export const registerHouseholdSchema = z.object({
  householdName: z.string().trim().min(1, "Household name is required").max(120),
  name: z.string().trim().min(1, "Your name is required").max(120),
  email: z.string().trim().email("Valid email required"),
  password: z.string().min(10, "Password must be at least 10 characters"),
});
