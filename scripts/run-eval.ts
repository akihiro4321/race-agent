import { runEvaluation } from "../src/eval/evaluate.js";

const models = ["qwen/qwen-3.5-plus", "moonshotai/kimi-k2.5"];
const runsPerScenario = 3;
const outputDir = "reports";

await runEvaluation({
  models,
  runsPerScenario,
  outputDir
});

console.log("評価が完了しました。reports/ ディレクトリを確認してください。");
