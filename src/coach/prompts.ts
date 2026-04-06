import type { UserProfileInput } from "./types.js";

type RetryContext = {
  attempt: number;
  previousError?: string;
};

function buildRetryInstruction(retry?: RetryContext): string {
  if (!retry || retry.attempt <= 1 || !retry.previousError) {
    return "";
  }

  return `
再生成指示:
- 前回の出力は次の理由で無効でした: ${retry.previousError}
- 上記の違反を解消し、同じ失敗を繰り返さないこと。
`.trim();
}

function buildJsonRules(): string {
  return `
共通ルール:
- Markdownを出力しないこと。
- JSON 以外の文章を出力しないこと。
- 余計なキーを追加しないこと。
- 必須キーを省略しないこと。
- 値がない場合に null を使わないこと。
`.trim();
}

export function goalValidityPrompt(
  input: UserProfileInput,
  vdot: number,
  retry?: RetryContext
): string {
  return `
あなたはランニングと筋トレを統合して計画するコーチです。必ず厳密なJSONのみを返してください。

タスク:
以下のユーザープロファイルに対して目標の妥当性を判定し、次の形式で返してください。
{
  "status": "ok" | "warn" | "ng",
  "reasons": string[],
  "suggestedAdjustments"?: string[]
}

ユーザープロファイル:
${JSON.stringify(input, null, 2)}

推定VDOT: ${vdot}

追加ルール:
- reasons は必ず1件以上にすること。
- status が "ok" の場合でも reasons は空配列にしないこと。
- status が "warn" または "ng" の場合、必要なら suggestedAdjustments を入れること。

${buildJsonRules()}
${buildRetryInstruction(retry)}
`.trim();
}

export function roadmapPrompt(input: UserProfileInput, vdot: number, retry?: RetryContext): string {
  return `
あなたはランニングと筋トレの計画アシスタントです。必ず厳密なJSONのみを返してください。

タスク:
週単位のロードマップ方針を生成し、次の形式で返してください。
{
  "summary": string,
  "weeks": [
    {
      "weekNumber": number,
      "runFrequency": 1-7,
      "intensity": "low" | "medium" | "high",
      "recoveryWeek": boolean,
      "strengthFrequency": 0-7
    }
  ]
}

制約:
- 期間は合計4〜8週間。
- weeks 配列の weekNumber は 1 から始まる連番にすること。
- beginner は開始直後から高強度にしないこと。
- 4週間以上なら回復週を最低1回含めること。
- 現実的で簡潔な内容にすること。

ユーザープロファイル:
${JSON.stringify(input, null, 2)}

推定VDOT: ${vdot}

追加ルール:
- runFrequency は 1〜7 の整数にすること。
- strengthFrequency は 0〜7 の整数にすること。
- recoveryWeek が true の週は intensity を "high" にしないこと。
- summary は 1〜2 文で簡潔に書くこと。

${buildJsonRules()}
${buildRetryInstruction(retry)}
`.trim();
}

export function cyclePrompt(
  input: UserProfileInput,
  roadmapJson: string,
  vdot: number,
  retry?: RetryContext
): string {
  return `
あなたはトレーニング計画コーチです。必ず厳密なJSONのみを返してください。

タスク:
ロードマップ方針から4週間の月間サイクルを生成してください。

出力形式:
{
  "summary": string,
  "weeks": [
    {
      "weekNumber": number,
      "focus": string,
      "keySessions": string[]
    }
  ]
}

要件:
- 週数は必ず4週。
- weeks 配列の weekNumber は 1, 2, 3, 4 の連番にすること。
- 各週のfocusは短く実用的にすること。
- keySessionsには現実的なラン/筋トレの主要セッションを列挙すること。
- keySessions は各週で最低1件入れること。

ユーザープロファイル:
${JSON.stringify(input, null, 2)}

ロードマップ方針:
${roadmapJson}

推定VDOT: ${vdot}

追加ルール:
- focus は 25 文字以内の短い日本語にすること。
- roadmap と矛盾する高負荷セッションを入れないこと。
- summary は月間テーマが分かる短文にすること。

${buildJsonRules()}
${buildRetryInstruction(retry)}
`.trim();
}
