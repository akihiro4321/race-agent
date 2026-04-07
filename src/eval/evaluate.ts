import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../coach/openrouter.js";
import {
  CoachPipelineError,
  runCoachPipeline,
  type CoachRunResult,
  type CoachStepName
} from "../coach/run-pipeline.js";
import { scenarios } from "./scenarios.js";
import { goalStatuses, type GoalStatus, type UserProfileInput } from "../coach/types.js";

export type EvaluationConfig = {
  models: string[];
  runsPerScenario: number;
  outputDir: string;
  scenarios?: UserProfileInput[];
};

export type ManualQualityReview = {
  model: string;
  profileId: string;
  runIndex: number;
  score: number;
  memo: string;
};

type RetryStepCounts = Record<CoachStepName, number>;
type GoalStatusCounts = Record<GoalStatus, number>;

export type ProfileEvaluationSummary = {
  totalRuns: number;
  succeededRuns: number;
  failedRuns: number;
  warningRuns: number;
  successRate: number;
  warningRate: number;
  avgLatencyMs: number;
  retryUsedRate: number;
  avgRetriesPerRun: number;
  goalStatusCounts: GoalStatusCounts;
  warningCodeCounts: Record<string, number>;
  failureCodeCounts: Record<string, number>;
};

export type EvaluationSummary = {
  totalRuns: number;
  succeededRuns: number;
  failedRuns: number;
  successRate: number;
  avgLatencyMs: number;
  retryUsedRate: number;
  avgRetriesPerRun: number;
  modelOutputInvalidRate: number;
  warningRate: number;
  goalStatusCounts: GoalStatusCounts;
  retryStepCounts: RetryStepCounts;
  warningCodeCounts: Record<string, number>;
  failureCodeCounts: Record<string, number>;
  failureStepCounts: Record<CoachStepName, number>;
  profileBreakdown: Record<string, ProfileEvaluationSummary>;
};

type RunFailure = {
  code: string;
  step?: CoachStepName;
  message: string;
};

type RunEnvelope = {
  ok: boolean;
  model: string;
  profileId: string;
  runIndex: number;
  result?: CoachRunResult;
  error?: RunFailure;
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, n) => acc + n, 0) / values.length;
}

function createRetryStepCounts(): RetryStepCounts {
  return { goalValidity: 0, roadmap: 0, cycle: 0 };
}

function createGoalStatusCounts(): GoalStatusCounts {
  return goalStatuses.reduce<GoalStatusCounts>(
    (acc, status) => ({
      ...acc,
      [status]: 0
    }),
    { ok: 0, warn: 0, ng: 0 }
  );
}

function getRetryTotal(result: CoachRunResult): number {
  return result.retries.goalValidity + result.retries.roadmap + result.retries.cycle;
}

function getWarningCode(warning: string): string {
  const separatorIndex = warning.indexOf(":");
  return separatorIndex >= 0 ? warning.slice(0, separatorIndex) : warning;
}

function countGoalStatuses(items: RunEnvelope[]): GoalStatusCounts {
  const counts = createGoalStatusCounts();
  for (const item of items) {
    if (!item.ok || !item.result) {
      continue;
    }
    counts[item.result.goalValidity.status] += 1;
  }
  return counts;
}

function countRetrySteps(items: RunEnvelope[]): RetryStepCounts {
  const counts = createRetryStepCounts();
  for (const item of items) {
    if (!item.ok || !item.result) {
      continue;
    }
    counts.goalValidity += item.result.retries.goalValidity;
    counts.roadmap += item.result.retries.roadmap;
    counts.cycle += item.result.retries.cycle;
  }
  return counts;
}

function countWarningCodes(items: RunEnvelope[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    if (!item.ok || !item.result) {
      return acc;
    }
    for (const warning of item.result.warnings) {
      const code = getWarningCode(warning);
      acc[code] = (acc[code] ?? 0) + 1;
    }
    return acc;
  }, {});
}

function countFailureCodes(items: RunEnvelope[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    if (!item.error) {
      return acc;
    }
    const code = item.error.code;
    acc[code] = (acc[code] ?? 0) + 1;
    return acc;
  }, {});
}

function summarize(items: RunEnvelope[]): EvaluationSummary {
  const success = items.filter((x) => x.ok && x.result);
  const failures = items.filter((x) => !x.ok && x.error);
  const retryUsed = success.filter((x) => getRetryTotal(x.result!) > 0);
  const warned = success.filter((x) => (x.result!.warnings?.length ?? 0) > 0);
  const warningCodeCounts = countWarningCodes(success);
  const failureCodeCounts = countFailureCodes(failures);
  const failureStepCounts = failures.reduce<Record<CoachStepName, number>>(
    (acc, item) => {
      const step = item.error?.step;
      if (!step) {
        return acc;
      }
      acc[step] += 1;
      return acc;
    },
    { goalValidity: 0, roadmap: 0, cycle: 0 }
  );
  const profileIds = Array.from(new Set(items.map((item) => item.profileId)));
  const profileBreakdown = profileIds.reduce<EvaluationSummary["profileBreakdown"]>(
    (acc, profileId) => {
      const profileItems = items.filter((item) => item.profileId === profileId);
      const profileSuccess = profileItems.filter((item) => item.ok && item.result);
      const profileFailures = profileItems.filter((item) => !item.ok && item.error);
      const profileWarned = profileSuccess.filter(
        (item) => (item.result!.warnings?.length ?? 0) > 0
      );
      const profileRetryUsed = profileSuccess.filter((item) => getRetryTotal(item.result!) > 0);
      acc[profileId] = {
        totalRuns: profileItems.length,
        succeededRuns: profileSuccess.length,
        failedRuns: profileFailures.length,
        warningRuns: profileWarned.length,
        successRate: profileSuccess.length / Math.max(profileItems.length, 1),
        warningRate: profileWarned.length / Math.max(profileSuccess.length, 1),
        avgLatencyMs: average(profileSuccess.map((item) => item.result!.latencyMs)),
        retryUsedRate: profileRetryUsed.length / Math.max(profileSuccess.length, 1),
        avgRetriesPerRun: average(profileSuccess.map((item) => getRetryTotal(item.result!))),
        goalStatusCounts: countGoalStatuses(profileSuccess),
        warningCodeCounts: countWarningCodes(profileSuccess),
        failureCodeCounts: countFailureCodes(profileFailures)
      };
      return acc;
    },
    {}
  );

  return {
    totalRuns: items.length,
    succeededRuns: success.length,
    failedRuns: failures.length,
    successRate: success.length / Math.max(items.length, 1),
    avgLatencyMs: average(success.map((x) => x.result!.latencyMs)),
    retryUsedRate: retryUsed.length / Math.max(success.length, 1),
    avgRetriesPerRun: average(success.map((x) => getRetryTotal(x.result!))),
    modelOutputInvalidRate:
      (failureCodeCounts.MODEL_OUTPUT_INVALID ?? 0) / Math.max(items.length, 1),
    warningRate: warned.length / Math.max(success.length, 1),
    goalStatusCounts: countGoalStatuses(success),
    retryStepCounts: countRetrySteps(success),
    warningCodeCounts,
    failureCodeCounts,
    failureStepCounts,
    profileBreakdown
  };
}

function toMarkdownReport(perModel: Record<string, EvaluationSummary>): string {
  const lines = [
    "# Race Agent POC 評価レポート",
    "",
    "| model | total | success | failed | success_rate | avg_latency_ms | retry_used_rate | avg_retries | model_output_invalid_rate | warning_rate |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|"
  ];
  for (const [model, s] of Object.entries(perModel)) {
    lines.push(
      `| ${model} | ${s.totalRuns} | ${s.succeededRuns} | ${s.failedRuns} | ${(
        s.successRate * 100
      ).toFixed(1)}% | ${s.avgLatencyMs.toFixed(0)} | ${(s.retryUsedRate * 100).toFixed(
        1
      )}% | ${s.avgRetriesPerRun.toFixed(2)} | ${(s.modelOutputInvalidRate * 100).toFixed(
        1
      )}% | ${(s.warningRate * 100).toFixed(1)}% |`
    );
  }
  lines.push("");
  lines.push("## モデル別詳細");
  for (const [model, s] of Object.entries(perModel)) {
    lines.push(`### ${model}`);
    lines.push(`- goal_status_counts: ${JSON.stringify(s.goalStatusCounts)}`);
    lines.push(`- retry_step_counts: ${JSON.stringify(s.retryStepCounts)}`);
    lines.push(`- warning_code_counts: ${JSON.stringify(s.warningCodeCounts)}`);
    lines.push(`- failure_code_counts: ${JSON.stringify(s.failureCodeCounts)}`);
    lines.push(`- failure_step_counts: ${JSON.stringify(s.failureStepCounts)}`);
    lines.push("- profile_breakdown:");
    for (const [profileId, profileSummary] of Object.entries(s.profileBreakdown)) {
      lines.push(
        `  - ${profileId}: success_rate=${(profileSummary.successRate * 100).toFixed(
          1
        )}%, warning_rate=${(profileSummary.warningRate * 100).toFixed(1)}%, retry_used_rate=${(
          profileSummary.retryUsedRate * 100
        ).toFixed(1)}%, avg_retries=${profileSummary.avgRetriesPerRun.toFixed(
          2
        )}, avg_latency_ms=${profileSummary.avgLatencyMs.toFixed(
          0
        )}, goal_status_counts=${JSON.stringify(
          profileSummary.goalStatusCounts
        )}, warning_code_counts=${JSON.stringify(
          profileSummary.warningCodeCounts
        )}, failure_code_counts=${JSON.stringify(profileSummary.failureCodeCounts)}`
      );
    }
  }
  lines.push("");
  lines.push("## 手動品質レビュー");
  lines.push("`reports/manual-quality-template.json` に 1-5 点のスコアとメモを記入してください。");
  return lines.join("\n");
}

function normalizeRunFailure(error: unknown): RunFailure {
  if (error instanceof CoachPipelineError) {
    return {
      code: error.code,
      step: error.step,
      message: error.message
    };
  }

  if (error instanceof Error) {
    return {
      code: "UNEXPECTED_ERROR",
      message: error.message
    };
  }

  return {
    code: "UNEXPECTED_ERROR",
    message: String(error)
  };
}

export async function runEvaluation(config: EvaluationConfig): Promise<void> {
  const runtimeConfig = loadConfig();
  await mkdir(config.outputDir, { recursive: true });
  const selectedScenarios = config.scenarios ?? scenarios;

  const allRuns: RunEnvelope[] = [];
  for (const model of config.models) {
    for (const scenario of selectedScenarios) {
      for (let i = 1; i <= config.runsPerScenario; i += 1) {
        try {
          const result = await runCoachPipeline({
            profile: scenario,
            model,
            config: runtimeConfig
          });
          allRuns.push({
            ok: true,
            model,
            profileId: scenario.profileId,
            runIndex: i,
            result
          });
        } catch (error) {
          allRuns.push({
            ok: false,
            model,
            profileId: scenario.profileId,
            runIndex: i,
            error: normalizeRunFailure(error)
          });
        }
      }
    }
  }

  const perModel: Record<string, EvaluationSummary> = {};
  for (const model of config.models) {
    perModel[model] = summarize(allRuns.filter((x) => x.model === model));
  }

  const manualTemplate: ManualQualityReview[] = allRuns
    .filter((x) => x.ok)
    .map((x) => ({
      model: x.model,
      profileId: x.profileId,
      runIndex: x.runIndex,
      score: 0,
      memo: ""
    }));

  await writeFile(join(config.outputDir, "runs.json"), JSON.stringify(allRuns, null, 2), "utf-8");
  await writeFile(
    join(config.outputDir, "summary.json"),
    JSON.stringify(perModel, null, 2),
    "utf-8"
  );
  await writeFile(join(config.outputDir, "report.md"), toMarkdownReport(perModel), "utf-8");
  await writeFile(
    join(config.outputDir, "manual-quality-template.json"),
    JSON.stringify(manualTemplate, null, 2),
    "utf-8"
  );
}
