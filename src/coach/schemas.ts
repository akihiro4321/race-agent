import { z } from "zod";

export const goalValiditySchema = z.object({
  status: z.enum(["ok", "warn", "ng"]),
  reasons: z.array(z.string()).min(1),
  suggestedAdjustments: z.array(z.string()).optional()
});

export const weekPolicySchema = z.object({
  weekNumber: z.number().int().positive(),
  runFrequency: z.number().int().min(1).max(7),
  intensity: z.enum(["low", "medium", "high"]),
  recoveryWeek: z.boolean(),
  strengthFrequency: z.number().int().min(0).max(7)
});

export const roadmapPolicySchema = z.object({
  summary: z.string().min(1),
  weeks: z.array(weekPolicySchema).min(1)
});

export const weekCycleSchema = z.object({
  weekNumber: z.number().int().positive(),
  focus: z.string().min(1),
  keySessions: z.array(z.string()).min(1)
});

export const monthlyCycleSchema = z.object({
  summary: z.string().min(1),
  weeks: z.array(weekCycleSchema).length(4)
});

export type GoalValiditySchema = z.infer<typeof goalValiditySchema>;
export type RoadmapPolicySchema = z.infer<typeof roadmapPolicySchema>;
export type MonthlyCycleSchema = z.infer<typeof monthlyCycleSchema>;
