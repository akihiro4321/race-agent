# Repository Guidelines

## ワークフロー・オーケストレーション

このリポジトリでは `~/.claude/skills/`（または `~/.codex/skills/`、`~/.gemini/skills/`）配下の dev-workflow スキル群を活用する。
ユーザーはスキル名を明示的に呼ぶ必要はない。意図を自然言語で伝えれば、以下のルールに従って適切なスキルを自動選択・実行する。

### 意図の解釈と自動ルーティング

ユーザーの発話を以下のパターンで判定し、対応するスキルを裏で実行する。複数パターンに該当する場合は上から優先する。

| ユーザーの意図（例） | 実行するスキル | 備考 |
|---|---|---|
| 「XXを作りたい」「YYの機能を追加したい」「このチケットに着手する」 | `$investigate` → 完了後 `$design-doc` → 完了後 `$review-design`（セルフチェック） | 一気通貫で実行。各段階の成果物はユーザーに提示して確認を取る |
| 「影響範囲を調べて」「このコードの依存を確認して」「要件を整理して」 | `$investigate` のみ | 調査だけで止める |
| 「設計書を作って」「設計をまとめて」 | `$design-doc` | 既に調査メモがある前提。なければ先に `$investigate` を提案する |
| 「設計書をレビューして」「設計をチェックして」 | `$review-design` | |
| 「レビューして」「diffを見て」「MRを確認して」+ コードの文脈 | `$review-code` | |
| 「実装して」「コードを書いて」「次のタスクを進めて」 | 設計書（`design.md`）の実装計画に従い、次の実装バッチを実行 | 実装前に設計書の存在を確認。なければ作成を提案する |
| 「前回の続き」「今の状態を確認して」「何をやるべき？」 | `$session-handoff`（再開モード） | |
| 「ここまでにする」「引き継ぎを残して」 | `$session-handoff`（終了モード） | |

判定に迷う場合は、ユーザーに「調査から始めますか？それとも直接実装しますか？」のように1問だけ確認する。

### 成果物の自動管理

環境変数 `DEV_WORKFLOW_HOME` が設定されている場合、成果物はその配下に自動保存する。
未設定の場合はリポジトリ配下の `docs/dev-workflow/` を使用する。

```
$DEV_WORKFLOW_HOME/（または docs/dev-workflow/）
  <whole-work-id>/
    investigation.md    ← $investigate の成果物
    design.md           ← $design-doc の成果物
    decisions.md        ← 重要な技術判断の記録
    work/
      <work-id>/
        implementation-plan.md  ← 実装計画（設計書から自動生成）
        session-log.md          ← セッションログ
```

### 状態の自動更新ルール

以下のタイミングで成果物を自動更新する。ユーザーの明示的な指示は不要。

1. **タスク完了時**: `implementation-plan.md` の該当タスクのチェックボックスを `[x]` に更新する
2. **ファイル変更時**: 実装で変更したファイルの一覧を `session-log.md` に追記する
3. **技術判断時**: 設計書の想定と異なる判断をした場合、理由を `decisions.md` に追記する
4. **セッション終了時**: ユーザーが「終わり」「ここまで」等と言ったら、`session-log.md` と `implementation-plan.md` を自動更新してから終了する
5. **セッション開始時**: 前回の成果物がある場合、`implementation-plan.md` と `session-log.md` を自動で読み、現在地を把握してから応答する

### 一気通貫実行の中断と再開

「XXを作りたい」のような一気通貫リクエストでも、各段階の成果物はユーザーに提示する。

- `$investigate` 完了後: 調査メモを提示し「設計に進みますか？」と確認する
- `$design-doc` 完了後: 設計書を提示し「実装に進みますか？」と確認する
- ユーザーが「ここまでで止めて」と言った場合: その時点で `$session-handoff`（終了モード）を自動実行する

### ナレッジスキルの自動参照

以下のナレッジスキルはユーザーが呼ぶものではなく、ワークフロースキルが必要に応じて自動的に参照する。

- `$architecture-reference`: サービス境界、データオーナー、共有基盤ルール
- `$coding-standards-java`: Java/Spring Boot コーディング規約
- `$coding-standards-javascript`: JavaScript/Vue.js レガシー規約
- `$testing-guide` / `$testing-guide-java`: テスト方針と技術スタック別ガイド

---

## プロジェクト構成

このリポジトリは Race Agent の **Coach中心POC** です。変更は「LLMの計画生成」と「軽量評価」に集中してください。

- `src/coach/`: プロンプト、スキーマ、OpenRouter呼び出し、実行パイプライン
- `src/eval/`: 固定シナリオと評価集計
- `scripts/`: 実行エントリーポイント（`run-eval.ts`）
- ルート設定: `package.json`、`tsconfig.json`、`.env.example`、`README.md`、`design-doc.md`
- 実行成果物: `reports/`（ソースコードは置かない）

## 開発・実行コマンド

- `npm install`: 依存関係をインストール
- `npm run typecheck`: TypeScriptの型検査（`tsc --noEmit`）
- `npm run eval`: POC評価を実行し、`reports/` に結果を出力

基本手順:
```bash
cp .env.example .env
npm install
npm run typecheck
npm run eval
```

## コーディング規約・命名

- 言語は TypeScript（ESM / strict）
- インデントは2スペース
- ファイル名は kebab-case（例: `run-pipeline.ts`）
- 型は PascalCase、関数・変数は camelCase
- LLM出力は必ず Zod で検証してから利用

## テスト方針（最小）

現時点では専用テストランナー未導入のため、以下を最低基準とします。
1. `npm run typecheck` が成功する
2. `npm run eval` が完走し、`reports/runs.json` に有効なJSONが出力される
3. `reports/manual-quality-template.json` に手動評価（1〜5点）を記録する

将来テスト追加時は `src/**/__tests__` または `tests/` に `*.test.ts` で配置します。

## コミット・PRルール

- コミット形式: `type(scope): summary`（例: `feat(coach): roadmap再生成ロジックを追加`）
- 1コミット1目的を原則とし、挙動変更時は理由を本文に記載
- PRには「目的」「主要変更点」「`reports/` の出力例」「プロンプト/スキーマ変更有無」を含める

## 言語運用ポリシー（重要）

- 本リポジトリのやりとりは原則すべて日本語とする
- 対象: チャット、Issue/PR説明、レビューコメント、コミット本文、設計メモ、評価レポート、LLMプロンプト
- 例外はライブラリ名・API名・コード識別子など、英語が事実上必須の箇所のみ

## セッション引き継ぎルール（重要）

このリポジトリでは、上記「ワークフロー・オーケストレーション」の自動更新ルールに従う。
加えて、以下のファイルも引き継ぎ対象として維持する。

- `docs/implementation-plan.md`: ステータスと直近タスク
- `docs/session-log.md`: 当日実施内容、次にやること、ブロッカー
- 重要な技術判断が発生した場合は `docs/adr/` にADRを追加する

## セキュリティ・設定

- `.env` やAPIキーはコミットしない
- 必須環境変数: `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL` など任意設定を変更した場合は README かPR説明で明示する