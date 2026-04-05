import { ZodError, type ZodType } from "zod";
import { cyclePrompt, goalValidityPrompt, roadmapPrompt } from "./prompts.js";
import {
  goalValiditySchema,
  monthlyCycleSchema,
  roadmapPolicySchema,
  userProfileSchema
} from "./schemas.js";
import { checkBasicFeasibility, estimateVdot } from "./mock-domain.js";
import { chatJson, type OpenRouterConfig } from "./openrouter.js";
import type {
  GoalValidityResult,
  MonthlyCyclePlan,
  RoadmapPolicy,
  UserProfileInput
} from "./types.js";

type StepResult<T> = {
  data: T;
  retries: number;
  latencyMs: number;
};

type CoachPipelineErrorCode = "CONFIG_ERROR" | "MODEL_OUTPUT_INVALID" | "OPENROUTER_ERROR";

export class CoachPipelineError extends Error {
  constructor(
    public readonly code: CoachPipelineErrorCode,
    message: string
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

function parseStepJson<T>(jsonText: string, schema: ZodType<T>): T {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new CoachPipelineError(
      "MODEL_OUTPUT_INVALID",
      `JSON parse に失敗しました: ${error instanceof Error ? error.message : String(error)}`
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
          .join(", ")}`
      );
    }
    throw error;
  }
}

function normalizePipelineError(error: unknown): Error {
  if (error instanceof CoachPipelineError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.message.startsWith("OpenRouter error:")) {
      return new CoachPipelineError("OPENROUTER_ERROR", error.message);
    }
    return error;
  }

  return new Error(String(error));
}

async function executeStep<T>(args: {
  model: string;
  prompt: string;
  parse: (jsonText: string) => T;
  config: OpenRouterConfig;
}): Promise<StepResult<T>> {
  const maxRetries = 2;
  const maxAttempts = maxRetries + 1;
  let totalLatency = 0;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { jsonText, latencyMs } = await chatJson({
        model: args.model,
        prompt: args.prompt,
        config: args.config
      });
      totalLatency += latencyMs;
      const data = args.parse(jsonText);
      return { data, retries: attempt - 1, latencyMs: totalLatency };
    } catch (error) {
      lastError = normalizePipelineError(error);
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
    model: input.model,
    prompt: goalValidityPrompt(input.profile, vdot),
    parse: (jsonText) => parseStepJson(jsonText, goalValiditySchema),
    config: input.config
  });

  const roadmapStep = await executeStep<RoadmapPolicy>({
    model: input.model,
    prompt: roadmapPrompt(input.profile, vdot),
    parse: (jsonText) => parseStepJson(jsonText, roadmapPolicySchema),
    config: input.config
  });

  const cycleStep = await executeStep<MonthlyCyclePlan>({
    model: input.model,
    prompt: cyclePrompt(input.profile, JSON.stringify(roadmapStep.data), vdot),
    parse: (jsonText) => parseStepJson(jsonText, monthlyCycleSchema),
    config: input.config
  });

  const warnings = checkBasicFeasibility(roadmapStep.data, cycleStep.data).map(
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
