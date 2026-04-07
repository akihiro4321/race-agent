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
  },
  {
    profileId: "boundary-no-strength-01",
    level: "intermediate",
    runningDaysPerWeek: 3,
    targetDate: "2026-09-06",
    canStrengthTrain: false,
    notes:
      "ジムや自重補強の時間を確保できない。strengthFrequency は 0 とし、補強メニューを含めないこと。"
  },
  {
    profileId: "boundary-very-tight-01",
    level: "beginner",
    runningDaysPerWeek: 2,
    targetDate: "2026-04-28",
    canStrengthTrain: false,
    notes:
      "目標日がかなり近い。完走より安全な準備を優先し、頻度を3回以上に増やしたり高強度を入れたりしないこと。"
  },
  {
    profileId: "boundary-returning-high-intensity-01",
    level: "returning",
    runningDaysPerWeek: 3,
    targetDate: "2026-07-19",
    canStrengthTrain: true,
    notes:
      "軽い違和感からの復帰直後。最初の4週はインターバル、テンポ走、坂ダッシュなどの高強度を避けたい。"
  }
];
