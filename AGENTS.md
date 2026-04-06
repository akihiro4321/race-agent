# Repository Guidelines

## 言語運用ポリシー（重要）

- 本リポジトリのやりとりは原則すべて日本語とする
- 対象: チャット、Issue/PR説明、レビューコメント、コミット本文、設計メモ、評価レポート、LLMプロンプト
- 例外はライブラリ名・API名・コード識別子など、英語が事実上必須の箇所のみ

---

## ナレッジスキルの自動参照
 
以下のナレッジスキルはユーザーが呼ぶものではなく、ワークフロースキルが必要に応じて自動的に参照する。
 
- `$architecture-reference`: アーキテクチャ判断、サービス境界、データオーナー、共有基盤ルール
- `$coding-standards-*`: 技術スタック別コーディング規約
- `$testing-guide` / `$testing-guide-*`: テスト方針と技術スタック別ガイド
---

## サブエージェント使い分けガイドライン

以下のカスタムエージェントが定義されている。
タスクの種類に応じて適切なエージェントへの委譲を検討すること。

### 利用可能なエージェント
- **explorer**: コードベースの調査・影響範囲特定（gpt-5.4-mini, read-only）
- **worker**: 軽〜中程度の実装・コード変更（gpt-5.4-mini）
- **heavy_coder**: 複雑なリファクタリング・マルチファイル変更（gpt-5.3-codex）

### 委譲ルール
- コード変更を伴う作業で、事前に影響範囲を調べる必要がある場合は
  explorerに調査を委譲してからworkerまたはheavy_coderに実装を指示すること
- 複雑なロジックの実装や既存コードへの影響が大きい修正はheavy_coderを使うこと
- 比較的単純でボイラーテンプレート生成などはworkerに実装を指示すること

---

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

## 実装時の必須チェック

- コード変更前後で `npm run format` を実行し、書式を揃える
- コード変更後は必ず `npm run typecheck` を実行する
- `npm run typecheck` でエラーが出た場合、そのまま終了せず、通るまで修正を継続する
- 回答前に `npm run format` と `npm run typecheck` の実行有無を確認し、未実行なら理由を明示する

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

## セキュリティ・設定

- `.env` やAPIキーはコミットしない
- 必須環境変数: `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL` など任意設定を変更した場合は README かPR説明で明示する
