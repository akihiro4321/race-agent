import { ZodError, type ZodType } from "zod";
import { cyclePrompt, goalValidityPrompt, roadmapPrompt } from "./prompts.js";
import {
  goalValiditySchema,
  monthlyCycleSchema,
  roadmapPolicySchema,
  userProfileSchema
} from "./schemas.js";
import { checkBasicFeasibility, estimateVdot } from "./mock-domain.js";
import { chatJson, OpenRouterError, type OpenRouterConfig } from "./openrouter.js";
import type {
  GoalValidityResult,
  MonthlyCyclePlan,
  RoadmapPolicy,
  UserProfileInput
} from "./types.js";

export const coachStepNames = ["goalValidity", "roadmap", "cycle"] as const;
export type CoachStepName = (typeof coachStepNames)[number];

type StepResult<T> = {
  data: T;
  retries: number;
  attempts: number;
  latencyMs: number;
};

type CoachPipelineErrorCode = "CONFIG_ERROR" | "MODEL_OUTPUT_INVALID" | "OPENROUTER_ERROR";

export class CoachPipelineError extends Error {
  constructor(
    public readonly code: CoachPipelineErrorCode,
    message: string,
    public readonly step?: CoachStepName,
    public readonly retryable = false
  ) {
    super(message);
    this.name = "CoachPipelineError";
  }
}

type RunResult = {
  profileId: string;
  model: string;
  goalValidity: GoalValidityResult;
  roadmap: RoadmapPolicy;
  cycle: MonthlyCyclePlan;
  vdot: number;
  retries: {
    goalValidity: number;
    roadmap: number;
    cycle: number;
  };
  latencyMs: number;
  warnings: string[];
};

function parseStepJson<T>(jsonText: string, schema: ZodType<T>, step: CoachStepName): T {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new CoachPipelineError(
      "MODEL_OUTPUT_INVALID",
      `JSON parse に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      step,
      true
    );
  }

  try {
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new CoachPipelineError(
        "MODEL_OUTPUT_INVALID",
        `スキーマ検証に失敗しました: ${error.issues
          .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
          .join(", ")}`,
        step,
        true
      );
    }
    throw error;
  }
}

function normalizePipelineError(error: unknown, step: CoachStepName): Error {
  if (error instanceof CoachPipelineError) {
    return error;
  }

  if (error instanceof OpenRouterError) {
    return new CoachPipelineError("OPENROUTER_ERROR", error.message, step, error.isRetryable);
  }

  if (error instanceof Error && error.message.startsWith("OpenRouter error:")) {
    return new CoachPipelineError("OPENROUTER_ERROR", error.message, step);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

async function executeStep<T>(args: {
  step: CoachStepName;
  model: string;
  buildPrompt: (context: { attempt: number; previousError?: string }) => string;
  parse: (jsonText: string) => T;
  config: OpenRouterConfig;
}): Promise<StepResult<T>> {
  const maxRetries = 2;
  const maxAttempts = maxRetries + 1;
  let totalLatency = 0;
  let lastError: unknown;
  let previousErrorMessage: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { jsonText, latencyMs } = await chatJson({
        model: args.model,
        prompt: args.buildPrompt({ attempt, previousError: previousErrorMessage }),
        config: args.config
      });
      totalLatency += latencyMs;
      const data = args.parse(jsonText);
      return { data, retries: attempt - 1, attempts: attempt, latencyMs: totalLatency };
    } catch (error) {
      const normalized = normalizePipelineError(error, args.step);
      lastError = normalized;

      if (
        normalized instanceof CoachPipelineError &&
        normalized.retryable &&
        attempt < maxAttempts
      ) {
        previousErrorMessage = normalized.message;
        continue;
      }

      break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown step error.");
}

export async function runCoachPipeline(input: {
  profile: UserProfileInput;
  model: string;
  config: OpenRouterConfig;
}): Promise<RunResult> {
  userProfileSchema.parse(input.profile);
  const vdot = estimateVdot(input.profile);

  const goalStep = await executeStep<GoalValidityResult>({
    step: "goalValidity",
    model: input.model,
    buildPrompt: ({ attempt, previousError }) =>
      goalValidityPrompt(input.profile, vdot, { attempt, previousError }),
    parse: (jsonText) => parseStepJson(jsonText, goalValiditySchema, "goalValidity"),
    config: input.config
  });

  const roadmapStep = await executeStep<RoadmapPolicy>({
    step: "roadmap",
    model: input.model,
    buildPrompt: ({ attempt, previousError }) =>
      roadmapPrompt(input.profile, vdot, { attempt, previousError }),
    parse: (jsonText) => parseStepJson(jsonText, roadmapPolicySchema, "roadmap"),
    config: input.config
  });

  const cycleStep = await executeStep<MonthlyCyclePlan>({
    step: "cycle",
    model: input.model,
    buildPrompt: ({ attempt, previousError }) =>
      cyclePrompt(input.profile, JSON.stringify(roadmapStep.data), vdot, {
        attempt,
        previousError
      }),
    parse: (jsonText) => parseStepJson(jsonText, monthlyCycleSchema, "cycle"),
    config: input.config
  });

  const warnings = checkBasicFeasibility(input.profile, roadmapStep.data, cycleStep.data).map(
    (w) => `${w.code}: ${w.message}`
  );

  return {
    profileId: input.profile.profileId,
    model: input.model,
    goalValidity: goalStep.data,
    roadmap: roadmapStep.data,
    cycle: cycleStep.data,
    vdot,
    retries: {
      goalValidity: goalStep.retries,
      roadmap: roadmapStep.retries,
      cycle: cycleStep.retries
    },
    latencyMs: goalStep.latencyMs + roadmapStep.latencyMs + cycleStep.latencyMs,
    warnings
  };
}

export type CoachRunResult = RunResult;
