import {
  cyclePrompt,
  goalValidityPrompt,
  roadmapPrompt
} from "./prompts.js";
import {
  goalValiditySchema,
  monthlyCycleSchema,
  roadmapPolicySchema
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

async function executeStep<T>(args: {
  model: string;
  prompt: string;
  parse: (jsonText: string) => T;
  config: OpenRouterConfig;
}): Promise<StepResult<T>> {
  const maxAttempts = 2;
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
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown step error.");
}

export async function runCoachPipeline(input: {
  profile: UserProfileInput;
  model: string;
  config: OpenRouterConfig;
}): Promise<RunResult> {
  const vdot = estimateVdot(input.profile);

  const goalStep = await executeStep<GoalValidityResult>({
    model: input.model,
    prompt: goalValidityPrompt(input.profile, vdot),
    parse: (jsonText) => goalValiditySchema.parse(JSON.parse(jsonText)),
    config: input.config
  });

  const roadmapStep = await executeStep<RoadmapPolicy>({
    model: input.model,
    prompt: roadmapPrompt(input.profile, vdot),
    parse: (jsonText) => roadmapPolicySchema.parse(JSON.parse(jsonText)),
    config: input.config
  });

  const cycleStep = await executeStep<MonthlyCyclePlan>({
    model: input.model,
    prompt: cyclePrompt(
      input.profile,
      JSON.stringify(roadmapStep.data),
      vdot
    ),
    parse: (jsonText) => monthlyCycleSchema.parse(JSON.parse(jsonText)),
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
