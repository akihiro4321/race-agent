import { runEvaluation } from "../src/eval/evaluate.js";

const models = ["openai/gpt-5.4-mini"];
const runsPerScenario = 3;
const outputDir = "reports";

await runEvaluation({
  models,
  runsPerScenario,
  outputDir
});

console.log("評価が完了しました。reports/ ディレクトリを確認してください。");
