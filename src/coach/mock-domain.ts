import type {
  FeasibilityWarning,
  MonthlyCyclePlan,
  RoadmapPolicy,
  UserProfileInput
} from "./types.js";

const vdotTable: Record<UserProfileInput["level"], number> = {
  beginner: 35,
  intermediate: 45,
  returning: 40
};

export function estimateVdot(profile: UserProfileInput): number {
  return vdotTable[profile.level] ?? 40;
}

export function checkBasicFeasibility(
  roadmap: RoadmapPolicy,
  cycle: MonthlyCyclePlan
): FeasibilityWarning[] {
  const warnings: FeasibilityWarning[] = [];
  const highWeeks = roadmap.weeks.filter((w) => w.intensity === "high").length;

  if (highWeeks >= 3) {
    warnings.push({
      code: "load_risk",
      message: "ロードマップ内で高強度週が多すぎる可能性があります。"
    });
  }

  let highFocusStreak = 0;
  for (const week of cycle.weeks) {
    const isHighFocus =
      week.focus.toLowerCase().includes("high") || week.focus.toLowerCase().includes("interval");
    highFocusStreak = isHighFocus ? highFocusStreak + 1 : 0;
    if (highFocusStreak >= 2) {
      warnings.push({
        code: "intensity_streak",
        message: "月間サイクルで高強度フォーカスが連続しています。"
      });
      break;
    }
  }

  return warnings;
}
