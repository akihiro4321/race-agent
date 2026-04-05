import type { UserProfileInput } from "./types.js";

export function goalValidityPrompt(input: UserProfileInput, vdot: number): string {
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

ルール:
- Markdownを出力しないこと。
- 余計なキーを追加しないこと。
- reasonsは必ず1件以上にすること。
`.trim();
}

export function roadmapPrompt(input: UserProfileInput, vdot: number): string {
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
- beginner は開始直後から高強度にしないこと。
- 4週間以上なら回復週を最低1回含めること。
- 現実的で簡潔な内容にすること。

ユーザープロファイル:
${JSON.stringify(input, null, 2)}

推定VDOT: ${vdot}

ルール:
- Markdownを出力しないこと。
- 余計なキーを追加しないこと。
`.trim();
}

export function cyclePrompt(input: UserProfileInput, roadmapJson: string, vdot: number): string {
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
- 各週のfocusは短く実用的にすること。
- keySessionsには現実的なラン/筋トレの主要セッションを列挙すること。

ユーザープロファイル:
${JSON.stringify(input, null, 2)}

ロードマップ方針:
${roadmapJson}

推定VDOT: ${vdot}

ルール:
- Markdownを出力しないこと。
- 余計なキーを追加しないこと。
`.trim();
}
