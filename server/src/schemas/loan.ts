import { z } from "zod";

export const quoteSchema = z.object({
  grossWeightGrams: z.number().min(0.01).max(1000),
  netWeightGrams: z.number().min(0.01).max(1000),
  karat: z.union([z.literal(18), z.literal(22), z.literal(24)])
}).refine(data => data.netWeightGrams <= data.grossWeightGrams, {
  message: "Net weight cannot exceed gross weight",
  path: ["netWeightGrams"]
});

export const leadSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(60).regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number"),
  grossWeightGrams: z.number().min(0.01).max(1000),
  netWeightGrams: z.number().min(0.01).max(1000),
  karat: z.union([z.literal(18), z.literal(22), z.literal(24)]),
  schemeId: z.string()
}).refine(data => data.netWeightGrams <= data.grossWeightGrams, {
  message: "Net weight cannot exceed gross weight",
  path: ["netWeightGrams"]
});
