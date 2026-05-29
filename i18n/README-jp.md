<div align="center">
<a href="https://voltagent.dev/">
<img width="1500" height="276" alt="voltagent" src="https://github.com/user-attachments/assets/d9ad69bd-b905-42a3-81af-99a0581348c0" />
</a>

<h3 align="center">
AIエージェントエンジニアリングプラットフォーム
</h3>

<div align="center">
<a href="../README.md">English</a> | <a href="README-cn-traditional.md">繁體中文</a> | <a href="README-cn-bsc.md">简体中文</a> | 日本語 | <a href="README-kr.md">한국어</a>
</div>

<br/>

<div align="center">
    <a href="https://voltagent.dev">ホームページ</a> |
    <a href="https://voltagent.dev/docs/">ドキュメント</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">サンプル</a>
</div>
</div>

<br/>

<div align="center">

[![GitHub issues](https://img.shields.io/github/issues/voltagent/voltagent)](https://github.com/voltagent/voltagent/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/voltagent/voltagent)](https://github.com/voltagent/voltagent/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)

[![npm downloads](https://img.shields.io/npm/dm/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)

</div>

<h3 align="center">
⭐ 気に入ったらスターをください ⬆️
</h3>

VoltAgentは、2つの主要な部分で構成されるエンドツーエンドのAIエージェントエンジニアリングプラットフォームです：

- **[オープンソースTypeScriptフレームワーク](#core-framework)** – メモリ、RAG、ガードレール、ツール、MCP、音声、ワークフローなど。
- **[VoltOpsコンソール](#voltops-console)** `クラウド` `セルフホスト` – 可観測性、自動化、デプロイ、評価、ガードレール、プロンプトなど。

完全なコード制御でエージェントを構築し、本番環境対応の可視性とオペレーションでリリースできます。

<h2 id="core-framework">コアTypeScriptフレームワーク</h2>

オープンソースフレームワークを使用すると、任意のAIプロバイダーに接続しながら、メモリ、ツール、複数ステップのワークフローを備えたインテリジェントなエージェントを構築できます。専門化されたエージェントがスーパーバイザーの調整下で連携する洗練されたマルチエージェントシステムを作成します。

- **[コアランタイム](https://voltagent.dev/docs/agents/overview/) (`@voltagent/core`)**: 型付きの役割、ツール、メモリ、モデルプロバイダーを1か所で定義し、すべてを整理された状態に保ちます。
- **[ワークフローエンジン](https://voltagent.dev/docs/workflows/overview/)**: カスタム制御フローをつなぎ合わせる代わりに、複数ステップの自動化を宣言的に記述します。
- **[スーパーバイザーとサブエージェント](https://voltagent.dev/docs/agents/sub-agents/)**: タスクをルーティングし、同期を維持するスーパーバイザーランタイムの下で、専門化されたエージェントのチームを実行します。
- **[ツールレジストリ](https://voltagent.dev/docs/agents/tools/)と[MCP](https://voltagent.dev/docs/agents/mcp/)**: ライフサイクルフックとキャンセル機能を備えたZod型のツールを提供し、追加の接着コードなしで[Model Context Protocol](https://modelcontextprotocol.io/)サーバーに接続します。
- **[LLM互換性](https://voltagent.dev/docs/getting-started/providers-models/)**: エージェントロジックを書き直さずに、設定を変更するだけでOpenAI、Anthropic、Googleなどのプロバイダー間を切り替えます。
- **[メモリ](https://voltagent.dev/docs/agents/memory/overview/)**: 永続的なメモリアダプターを接続して、エージェントが実行間で重要なコンテキストを記憶できるようにします。
- **[検索とRAG](https://voltagent.dev/docs/rag/overview/)**: データソースから事実を取得し、モデルが回答する前に応答を根拠づける（RAG）レトリーバーエージェントをプラグインします。
- **[VoltAgentナレッジベース](https://voltagent.dev/docs/rag/voltagent/)**: ドキュメントの取り込み、チャンク化、埋め込み、検索のためのマネージドRAGサービスを使用します。
- **[音声](https://voltagent.dev/docs/agents/voice/)**: OpenAI、ElevenLabs、またはカスタム音声プロバイダーでテキスト読み上げと音声認識機能を追加します。
- **[ガードレール](https://voltagent.dev/docs/guardrails/overview/)**: 実行時にエージェントの入力または出力を傍受して検証し、コンテンツポリシーと安全ルールを適用します。
- **[評価](https://voltagent.dev/docs/evals/overview/)**: ワークフローと並行してエージェント評価スイートを実行し、エージェントの動作を測定および改善します。

#### MCPサーバー (@voltagent/mcp-docs-server)

Claude、Cursor、WindsurfなどのAI搭載コーディングアシスタント向けに、MCPサーバー`@voltagent/mcp-docs-server`を使用してLLMにVoltAgentの使用方法を教えることができます。これにより、AIアシスタントはコーディング中にVoltAgentのドキュメント、例、変更ログに直接アクセスできます。

📖 [MCPドキュメントサーバーのセットアップ方法](https://voltagent.dev/docs/getting-started/mcp-docs-server/)

## ⚡ クイックスタート

`create-voltagent-app` CLIツールを使用して、数秒で新しいVoltAgentプロジェクトを作成します：

```bash
npm create voltagent-app@latest
```

このコマンドがセットアップをガイドします。

エージェントと包括的なワークフロー例の両方を登録する`src/index.ts`でスターターコードが表示され、ワークフローの例は`src/workflows/index.ts`にあります。

```typescript
import { VoltAgent, Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { openai } from "@ai-sdk/openai";
import { expenseApprovalWorkflow } from "./workflows";
import { weatherTool } from "./tools";

// ロガーインスタンスの作成
const logger = createPinoLogger({
  name: "my-agent-app",
  level: "info",
});

// オプションの永続メモリ（デフォルトのインメモリを使用する場合は削除）
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
});

// プロジェクト用のシンプルな汎用エージェント
const agent = new Agent({
  name: "my-agent",
  instructions: "天気を確認し、さまざまなタスクを支援できる便利なアシスタント",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  memory,
});

// エージェントとワークフローでVoltAgentを初期化
new VoltAgent({
  agents: {
    agent,
  },
  workflows: {
    expenseApprovalWorkflow,
  },
  server: honoServer(),
  logger,
});
```

その後、プロジェクトに移動して実行します：

```bash
npm run dev
```

devコマンドを実行すると、tsxがコードをコンパイルして実行します。ターミナルにVoltAgentサーバー起動メッセージが表示されます：

```
══════════════════════════════════════════════════
VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
✓ HTTP Server: http://localhost:3141

Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
```

エージェントが実行中です！対話するには：

1. コンソールを開く：ターミナル出力の[VoltOps LLM可観測性プラットフォーム](https://console.voltagent.dev)リンクをクリックします（またはブラウザにコピー&ペースト）。
2. エージェントを見つける：VoltOps LLM可観測性プラットフォームページで、エージェントがリストされているはずです（例：「my-agent」）。
3. エージェントの詳細を開く：エージェント名をクリックします。
4. チャットを開始：エージェント詳細ページで、右下のチャットアイコンをクリックしてチャットウィンドウを開きます。
5. メッセージを送信：「こんにちは」のようなメッセージを入力してEnterキーを押します。

[![VoltAgent Demo](https://github.com/user-attachments/assets/26340c6a-be34-48a5-9006-e822bf6098a7)](https://github.com/user-attachments/assets/26340c6a-be34-48a5-9006-e822bf6098a7)

### 最初のワークフローの実行

新しいプロジェクトには強力なワークフローエンジンも含まれています。

経費承認ワークフローは、一時停止/再開機能を備えたヒューマン・イン・ザ・ループ自動化を実証します：

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

export const expenseApprovalWorkflow = createWorkflowChain({
  id: "expense-approval",
  name: "Expense Approval Workflow",
  purpose: "Process expense reports with manager approval for high amounts",

  input: z.object({
    employeeId: z.string(),
    amount: z.number(),
    category: z.string(),
    description: z.string(),
  }),
  result: z.object({
    status: z.enum(["approved", "rejected"]),
    approvedBy: z.string(),
    finalAmount: z.number(),
  }),
})
  // ステップ1：経費を検証し、承認が必要かどうかを確認
  .andThen({
    id: "check-approval-needed",
    resumeSchema: z.object({
      approved: z.boolean(),
      managerId: z.string(),
      comments: z.string().optional(),
      adjustedAmount: z.number().optional(),
    }),
    execute: async ({ data, suspend, resumeData }) => {
      // マネージャーの決定で再開する場合
      if (resumeData) {
        return {
          ...data,
          approved: resumeData.approved,
          approvedBy: resumeData.managerId,
          finalAmount: resumeData.adjustedAmount || data.amount,
        };
      }

      // マネージャーの承認が必要かどうかを確認（$500を超える経費）
      if (data.amount > 500) {
        await suspend("Manager approval required", {
          employeeId: data.employeeId,
          requestedAmount: data.amount,
        });
      }

      // 少額の経費を自動承認
      return {
        ...data,
        approved: true,
        approvedBy: "system",
        finalAmount: data.amount,
      };
    },
  })
  // ステップ2：最終決定を処理
  .andThen({
    id: "process-decision",
    execute: async ({ data }) => {
      return {
        status: data.approved ? "approved" : "rejected",
        approvedBy: data.approvedBy,
        finalAmount: data.finalAmount,
      };
    },
  });
```

VoltOpsコンソールから直接、事前構築された`expenseApprovalWorkflow`をテストできます：

[![expense-approval](https://github.com/user-attachments/assets/3d3ea67b-4ab5-4dc0-932d-cedd92894b18)](https://github.com/user-attachments/assets/3d3ea67b-4ab5-4dc0-932d-cedd92894b18)

1.  **ワークフローページに移動**：サーバーを起動した後、[ワークフローページ](https://console.voltagent.dev/workflows)に直接移動します。
2.  **プロジェクトを選択**：プロジェクトセレクターを使用してプロジェクトを選択します（例：「my-agent-app」）。
3.  **検索して実行**：**「Expense Approval Workflow」**がリストされているのが見えます。クリックしてから**「Run」**ボタンをクリックします。
4.  **入力を提供**：ワークフローは経費詳細を含むJSONオブジェクトを期待します。自動承認用の少額経費を試してみてください：
    ```json
    {
      "employeeId": "EMP-123",
      "amount": 250,
      "category": "office-supplies",
      "description": "New laptop mouse and keyboard"
    }
    ```
5.  **結果を表示**：実行後、各ステップの詳細なログを検査し、コンソールで直接最終出力を確認できます。

## サンプル

より多くのサンプルについては、[サンプルリポジトリ](https://github.com/VoltAgent/voltagent/tree/main/examples)をご覧ください。

- **[Airtableエージェント](https://voltagent.dev/recipes-and-guides/airtable-agent)** - 新しいレコードに反応し、VoltOpsアクションでAirtableに更新を書き戻します。
- **[Slackエージェント](https://voltagent.dev/recipes-and-guides/slack-agent)** - チャンネルメッセージに応答し、VoltOps Slackアクションで返信します。
- **[ChatGPTアプリとVoltAgent](https://voltagent.dev/examples/agents/chatgpt-app)** - VoltAgentをMCP経由でデプロイし、ChatGPTアプリに接続します。
- **[WhatsApp注文エージェント](https://voltagent.dev/examples/agents/whatsapp-ai-agent)** - 自然な会話で食品注文を処理するWhatsAppチャットボットを構築します。（[ソースコード](https://github.com/VoltAgent/voltagent/tree/main/examples/with-whatsapp)）
- **[YouTubeからブログエージェント](https://voltagent.dev/examples/agents/youtube-blog-agent)** - MCPツールを使用したスーパーバイザーエージェントでYouTube動画をMarkdownブログ投稿に変換します。（[ソースコード](https://github.com/VoltAgent/voltagent/tree/main/examples/with-youtube-to-blog)）
- **[AI広告生成エージェント](https://voltagent.dev/examples/agents/ai-instagram-ad-agent)** - BrowserBase StagehandとGoogle Gemini AIを使用してInstagram広告を生成します。（[ソースコード](https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator)）
- **[AIレシピ生成エージェント](https://voltagent.dev/examples/agents/recipe-generator)** - 材料と好みに基づいてパーソナライズされた料理提案を作成します。（[ソースコード](https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator) | [ビデオ](https://youtu.be/KjV1c6AhlfY)）
- **[AI研究アシスタントエージェント](https://voltagent.dev/examples/agents/research-assistant)** - 包括的なレポートを生成するマルチエージェント研究ワークフロー。（[ソースコード](https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant) | [ビデオ](https://youtu.be/j6KAUaoZMy4)）

<h2 id="voltops-console">VoltOpsコンソール：LLM可観測性 - 自動化 - デプロイ</h2>

VoltOpsコンソールは、VoltAgentのプラットフォーム側であり、可観測性、自動化、デプロイを提供し、リアルタイムの実行トレース、パフォーマンスメトリクス、ビジュアルダッシュボードで本番環境のエージェントを監視およびデバッグできます。

🎬 [ライブデモを試す](https://console.voltagent.dev/demo)

📖 [VoltOpsドキュメント](https://voltagent.dev/voltops-llm-observability-docs/)

🚀 [VoltOpsプラットフォーム](https://voltagent.dev/voltops-llm-observability/)

### 可観測性とトレース

詳細なトレースとパフォーマンスメトリクスでエージェントの実行フローを深く掘り下げます。

<img alt="1" src="https://github.com/user-attachments/assets/21c6d05d-f333-4c61-9218-8862d16110fd" />

### ダッシュボード

すべてのエージェント、ワークフロー、システムパフォーマンスメトリクスの包括的な概要を取得します。

<img alt="dashboar" src="https://github.com/user-attachments/assets/c88a5543-219e-4cf0-8f41-14a68ca297fb" />

### ログ

すべてのエージェントインタラクションとワークフローステップの詳細な実行ログを追跡します。

![VoltOps Logs](https://cdn.voltagent.dev/console/logs.png)

### メモリ管理

エージェントのメモリ、コンテキスト、会話履歴を検査および管理します。

![VoltOps Memory Overview](https://cdn.voltagent.dev/console/memory.png)

### トレース

エージェントの動作を理解し、パフォーマンスを最適化するために完全な実行トレースを分析します。

![VoltOps Traces](https://cdn.voltagent.dev/console/traces.png)

### プロンプトビルダー

コンソールで直接プロンプトを設計、テスト、改良します。

<img alt="prompts" src="https://github.com/user-attachments/assets/fb6d71eb-8f81-4443-a494-08c33ec9bcc4" />

### デプロイ

ワンクリックのGitHub統合とマネージドインフラストラクチャでエージェントを本番環境にデプロイします。

<img alt="deployment" src="https://github.com/user-attachments/assets/e329ab4b-7464-435a-96cc-90214e8a3cfa" />

📖 [VoltOpsデプロイドキュメント](https://voltagent.dev/docs/deployment/voltops/)

### トリガーとアクション

ウェブフック、スケジュール、カスタムトリガーでエージェントワークフローを自動化し、外部イベントに反応します。

<img width="1277" alt="triggers" src="https://github.com/user-attachments/assets/67e36934-2eb5-4cf1-94f8-3057d805ef65" />

### モニタリング

システム全体のエージェントの健全性、パフォーマンスメトリクス、リソース使用量を監視します。

<img alt="monitoring" src="https://github.com/user-attachments/assets/1fd1151f-5ee4-4c7c-8ec7-29874e37c48f" />

### ガードレール

エージェントが定義されたパラメーター内で動作するように、安全境界とコンテンツフィルターを設定します。

<img alt="guardrails" src="https://github.com/user-attachments/assets/52bd51f0-944e-4202-9f54-7bb2e0e2d1f6" />

### 評価

ベンチマークに対してエージェントの動作、精度、パフォーマンスをテストする評価スイートを実行します。

<img alt="evals" src="https://github.com/user-attachments/assets/510cc180-2661-4973-a48f-074d4703d90b" />

### RAG（ナレッジベース）

組み込みの検索拡張生成機能でエージェントをナレッジソースに接続します。

<img alt="rag" src="https://github.com/user-attachments/assets/a6c2f668-7ad1-4fb6-b67f-654335285f1e" />

## VoltAgentを学ぶ

- **[インタラクティブチュートリアルから始める](https://voltagent.dev/tutorial/introduction/)** ことで、AIエージェント構築の基礎を学びます。
- **[ドキュメント](https://voltagent.dev/docs/)**: ガイド、概念、チュートリアルを深く掘り下げます。
- **[サンプル](https://github.com/voltagent/voltagent/tree/main/examples)**: 実用的な実装を探索します。
- **[ブログ](https://voltagent.dev/blog/)**: 技術的な洞察とベストプラクティスについて詳しく読みます。

## 貢献

私たちは貢献を歓迎します！貢献ガイドラインを参照してください（利用可能な場合はリンクが必要）。質問や議論については、[Discord](https://s.voltagent.dev/discord)サーバーに参加してください。

## 貢献者 ♥️ ありがとう

プラグインを構築したり、イシューを開いたり、プルリクエストを提出したり、DiscordやGitHubディスカッションで誰かを助けたりして、VoltAgentの旅の一部となったすべての人に心から感謝します。

VoltAgentはコミュニティの努力であり、あなたのような人々のおかげで継続的に改善されています。

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent&max=500&columns=20&anon=1)

## ライセンス

MITライセンスの下でライセンスされています、Copyright © 2026-present VoltAgent.
