export const goalStatuses = ["ok", "warn", "ng"] as const;
export type GoalStatus = (typeof goalStatuses)[number];

export const userLevels = ["beginner", "intermediate", "returning"] as const;
export type UserLevel = (typeof userLevels)[number];

export const intensityLevels = ["low", "medium", "high"] as const;
export type IntensityLevel = (typeof intensityLevels)[number];

export const feasibilityWarningCodes = ["load_risk", "intensity_streak"] as const;
export type FeasibilityWarningCode = (typeof feasibilityWarningCodes)[number];

export const roadmapWeekRange = {
  min: 4,
  max: 8
} as const;

export const monthlyCycleWeeks = 4 as const;

export type UserProfileInput = {
  profileId: string;
  level: UserLevel;
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
  intensity: IntensityLevel;
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
  code: FeasibilityWarningCode;
  message: string;
};
