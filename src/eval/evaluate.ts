import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../coach/openrouter.js";
import { runCoachPipeline, type CoachRunResult } from "../coach/run-pipeline.js";
import { scenarios } from "./scenarios.js";

export type EvaluationConfig = {
  models: string[];
  runsPerScenario: number;
  outputDir: string;
};

export type ManualQualityReview = {
  model: string;
  profileId: string;
  runIndex: number;
  score: number;
  memo: string;
};

export type EvaluationSummary = {
  totalRuns: number;
  succeededRuns: number;
  successRate: number;
  avgLatencyMs: number;
  retryUsedRate: number;
  warningRate: number;
};

type RunEnvelope = {
  ok: boolean;
  model: string;
  profileId: string;
  runIndex: number;
  result?: CoachRunResult;
  error?: string;
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, n) => acc + n, 0) / values.length;
}

function summarize(items: RunEnvelope[]): EvaluationSummary {
  const success = items.filter((x) => x.ok && x.result);
  const retryUsed = success.filter((x) => {
    const r = x.result!.retries;
    return r.goalValidity + r.roadmap + r.cycle > 0;
  });
  const warned = success.filter((x) => (x.result!.warnings?.length ?? 0) > 0);

  return {
    totalRuns: items.length,
    succeededRuns: success.length,
    successRate: success.length / Math.max(items.length, 1),
    avgLatencyMs: average(success.map((x) => x.result!.latencyMs)),
    retryUsedRate: retryUsed.length / Math.max(success.length, 1),
    warningRate: warned.length / Math.max(success.length, 1)
  };
}

function toMarkdownReport(perModel: Record<string, EvaluationSummary>): string {
  const lines = [
    "# Race Agent POC 評価レポート",
    "",
    "| model | total | success | success_rate | avg_latency_ms | retry_used_rate | warning_rate |",
    "|---|---:|---:|---:|---:|---:|---:|"
  ];
  for (const [model, s] of Object.entries(perModel)) {
    lines.push(
      `| ${model} | ${s.totalRuns} | ${s.succeededRuns} | ${(
        s.successRate * 100
      ).toFixed(1)}% | ${s.avgLatencyMs.toFixed(0)} | ${(
        s.retryUsedRate * 100
      ).toFixed(1)}% | ${(s.warningRate * 100).toFixed(1)}% |`
    );
  }
  lines.push("");
  lines.push("## 手動品質レビュー");
  lines.push(
    "`reports/manual-quality-template.json` に 1-5 点のスコアとメモを記入してください。"
  );
  return lines.join("\n");
}

export async function runEvaluation(config: EvaluationConfig): Promise<void> {
  const runtimeConfig = loadConfig();
  await mkdir(config.outputDir, { recursive: true });

  const allRuns: RunEnvelope[] = [];
  for (const model of config.models) {
    for (const scenario of scenarios) {
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
            error: error instanceof Error ? error.message : String(error)
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

  await writeFile(
    join(config.outputDir, "runs.json"),
    JSON.stringify(allRuns, null, 2),
    "utf-8"
  );
  await writeFile(
    join(config.outputDir, "summary.json"),
    JSON.stringify(perModel, null, 2),
    "utf-8"
  );
  await writeFile(
    join(config.outputDir, "report.md"),
    toMarkdownReport(perModel),
    "utf-8"
  );
  await writeFile(
    join(config.outputDir, "manual-quality-template.json"),
    JSON.stringify(manualTemplate, null, 2),
    "utf-8"
  );
}
