import { z } from "zod";
import {
  goalStatuses,
  intensityLevels,
  monthlyCycleWeeks,
  roadmapWeekRange,
  userLevels
} from "./types.js";

function validateSequentialWeekNumbers(
  weeks: Array<{ weekNumber: number }>,
  ctx: z.RefinementCtx
): void {
  for (const [index, week] of weeks.entries()) {
    const expectedWeekNumber = index + 1;
    if (week.weekNumber !== expectedWeekNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `weekNumber は ${expectedWeekNumber} を指定してください。`,
        path: [index, "weekNumber"]
      });
    }
  }
}

export const userProfileSchema = z
  .object({
    profileId: z.string().min(1),
    level: z.enum(userLevels),
    runningDaysPerWeek: z.number().int().min(1).max(7),
    targetDate: z.string().date(),
    canStrengthTrain: z.boolean(),
    notes: z.string().min(1)
  })
  .strict();

export const goalValiditySchema = z
  .object({
    status: z.enum(goalStatuses),
    reasons: z.array(z.string()).min(1),
    suggestedAdjustments: z.array(z.string()).optional()
  })
  .strict();

export const weekPolicySchema = z
  .object({
    weekNumber: z.number().int().positive(),
    runFrequency: z.number().int().min(1).max(7),
    intensity: z.enum(intensityLevels),
    recoveryWeek: z.boolean(),
    strengthFrequency: z.number().int().min(0).max(7)
  })
  .strict();

export const roadmapPolicySchema = z
  .object({
    summary: z.string().min(1),
    weeks: z
      .array(weekPolicySchema)
      .min(roadmapWeekRange.min)
      .max(roadmapWeekRange.max)
      .superRefine((weeks, ctx) => {
        validateSequentialWeekNumbers(weeks, ctx);
      })
  })
  .strict();

export const weekCycleSchema = z
  .object({
    weekNumber: z.number().int().positive(),
    focus: z.string().min(1),
    keySessions: z.array(z.string()).min(1)
  })
  .strict();

export const monthlyCycleSchema = z
  .object({
    summary: z.string().min(1),
    weeks: z
      .array(weekCycleSchema)
      .length(monthlyCycleWeeks)
      .superRefine((weeks, ctx) => {
        validateSequentialWeekNumbers(weeks, ctx);
      })
  })
  .strict();

export type UserProfileSchema = z.infer<typeof userProfileSchema>;
export type GoalValiditySchema = z.infer<typeof goalValiditySchema>;
export type RoadmapPolicySchema = z.infer<typeof roadmapPolicySchema>;
export type MonthlyCycleSchema = z.infer<typeof monthlyCycleSchema>;
