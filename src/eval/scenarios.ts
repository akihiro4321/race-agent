import type { UserProfileInput } from "../coach/types.js";

export const scenarios: UserProfileInput[] = [
  {
    profileId: "beginner-01",
    level: "beginner",
    runningDaysPerWeek: 3,
    targetDate: "2026-09-15",
    canStrengthTrain: true,
    notes: "大会経験なし。まずは運動習慣の定着を優先したい。"
  },
  {
    profileId: "intermediate-01",
    level: "intermediate",
    runningDaysPerWeek: 4,
    targetDate: "2026-08-30",
    canStrengthTrain: true,
    notes: "10km大会経験あり。ハーフ完走に向けて段階的に伸ばしたい。"
  },
  {
    profileId: "returning-01",
    level: "returning",
    runningDaysPerWeek: 2,
    targetDate: "2026-10-12",
    canStrengthTrain: false,
    notes: "ブランク明け。オーバーロードを避けて再開したい。"
  }
];
