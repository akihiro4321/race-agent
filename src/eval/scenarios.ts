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
  },
  {
    profileId: "boundary-low-volume-01",
    level: "beginner",
    runningDaysPerWeek: 1,
    targetDate: "2026-07-05",
    canStrengthTrain: false,
    notes: "週1回しか走れない。無理な頻度増加や補強前提の計画は避けたい。"
  },
  {
    profileId: "boundary-tight-schedule-01",
    level: "returning",
    runningDaysPerWeek: 2,
    targetDate: "2026-05-24",
    canStrengthTrain: true,
    notes: "短期間での復帰を急いでおり、回復週が抜けた無理な詰め込みを避けたい。"
  }
];
