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

const highIntensityKeywords = [
  "high",
  "interval",
  "tempo",
  "threshold",
  "hill",
  "sprint",
  "race pace",
  "ペース",
  "インターバル",
  "テンポ",
  "閾値",
  "坂"
];

const recoveryKeywords = ["recovery", "easy", "rest", "回復", "リカバリー", "イージー", "休養"];

const strengthKeywords = ["strength", "gym", "weights", "筋トレ", "補強", "ウエイト"];

function containsAnyKeyword(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

export function checkBasicFeasibility(
  profile: UserProfileInput,
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

  const hasRecoveryWeek = roadmap.weeks.some((week) => week.recoveryWeek);
  if (!hasRecoveryWeek) {
    warnings.push({
      code: "recovery_gap",
      message: "ロードマップに回復週がなく、負荷調整が不足している可能性があります。"
    });
  }

  const frequencySpike = roadmap.weeks.some((week, index) => {
    const previous = roadmap.weeks[index - 1];
    if (!previous) {
      return week.runFrequency > profile.runningDaysPerWeek + 1;
    }
    return week.runFrequency - previous.runFrequency >= 2;
  });
  if (frequencySpike) {
    warnings.push({
      code: "frequency_spike",
      message: "週あたりの走行頻度が急に上がっており、継続しづらい可能性があります。"
    });
  }

  const strengthPlanned =
    roadmap.weeks.some((week) => week.strengthFrequency > 0) ||
    cycle.weeks.some((week) =>
      week.keySessions.some((session) => containsAnyKeyword(session, strengthKeywords))
    );
  if (!profile.canStrengthTrain && strengthPlanned) {
    warnings.push({
      code: "strength_mismatch",
      message: "筋力トレーニング不可のプロフィールに対して補強メニューが含まれています。"
    });
  }

  let highFocusStreak = 0;
  for (const [index, week] of cycle.weeks.entries()) {
    const isHighFocus =
      containsAnyKeyword(week.focus, highIntensityKeywords) ||
      week.keySessions.some((session) => containsAnyKeyword(session, highIntensityKeywords));
    highFocusStreak = isHighFocus ? highFocusStreak + 1 : 0;
    if (highFocusStreak >= 2) {
      warnings.push({
        code: "intensity_streak",
        message: "月間サイクルで高強度フォーカスが連続しています。"
      });
      break;
    }

    const roadmapWeek = roadmap.weeks[index];
    if (!roadmapWeek) {
      continue;
    }

    const cycleText = [week.focus, ...week.keySessions].join(" ");
    const hasRecoverySignal = containsAnyKeyword(cycleText, recoveryKeywords);
    if (roadmapWeek.recoveryWeek && !hasRecoverySignal) {
      warnings.push({
        code: "focus_mismatch",
        message: "回復週に対応する軽めのフォーカスが月間サイクルに反映されていません。"
      });
      break;
    }

    const hasHighSignal = containsAnyKeyword(cycleText, highIntensityKeywords);
    if (roadmapWeek.intensity === "low" && hasHighSignal) {
      warnings.push({
        code: "focus_mismatch",
        message: "低強度週に高強度セッションが含まれている可能性があります。"
      });
      break;
    }
  }

  return warnings;
}
