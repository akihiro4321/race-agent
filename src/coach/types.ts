export type GoalStatus = "ok" | "warn" | "ng";

export type UserProfileInput = {
  profileId: string;
  level: "beginner" | "intermediate" | "returning";
  runningDaysPerWeek: number;
  targetDate: string;
  canStrengthTrain: boolean;
  notes: string;
};

export type GoalValidityResult = {
  status: GoalStatus;
  reasons: string[];
  suggestedAdjustments?: string[];
};

export type WeekPolicy = {
  weekNumber: number;
  runFrequency: number;
  intensity: "low" | "medium" | "high";
  recoveryWeek: boolean;
  strengthFrequency: number;
};

export type RoadmapPolicy = {
  summary: string;
  weeks: WeekPolicy[];
};

export type WeekCycle = {
  weekNumber: number;
  focus: string;
  keySessions: string[];
};

export type MonthlyCyclePlan = {
  summary: string;
  weeks: WeekCycle[];
};

export type FeasibilityWarning = {
  code: "load_risk" | "intensity_streak";
  message: string;
};
