<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/9259e833-0f5c-4eb6-8cc7-4e6930cc27e1" />
</a>

<br/>
<br/>
<div align="center">
<a href="../README.md">English</a> | <a href="README-cn-traditional.md">繁體中文</a> | <a href="README-cn-bsc.md">简体中文</a> | 日本語 | <a href="README-kr.md">한국어</a>
</div>

<br/>

<div align="center">
    <a href="https://voltagent.dev">ホーム</a> |
    <a href="https://voltagent.dev/docs/">ドキュメント</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">サンプル</a>
</div>
</div>

<br/>

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/voltagent/voltagent?style=social)](https://github.com/voltagent/voltagent)
[![GitHub issues](https://img.shields.io/github/issues/voltagent/voltagent)](https://github.com/voltagent/voltagent/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/voltagent/voltagent)](https://github.com/voltagent/voltagent/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)

[![npm downloads](https://img.shields.io/npm/dm/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)

</div>

<br/>

**VoltAgent**は、AIエージェントを構築し、オーケストレーションするためのオープンソースTypeScriptフレームワークです。
メモリ、ワークフロー、ツール、組み込みのLLM可観測性を備えた本番環境対応のエージェントを構築できます。

## なぜVoltAgentなのか？

- **初日から本番環境対応**: インフラをゼロから構築する代わりに、組み込みのメモリ、ワークフロー、可観測性を備えたエージェントをデプロイします。
- **自信を持ってコーディング**: エージェントシステム全体で型安全なツール、自動推論、コンパイル時の安全性を備えた完全なTypeScriptサポート。
- **プロのようにデバッグ**: 組み込みのVoltOps可観測性により、すべての決定を追跡し、パフォーマンスを監視し、外部ツールなしでリアルタイムでワークフローを最適化します。
- **複雑なシステムをシンプルに構築**: プロトタイプから本番環境までスケールする、スーパーバイザーの調整、宣言的ワークフロー、モジュラーアーキテクチャでマルチエージェントチームをオーケストレーションします。

## エージェント開発プラットフォーム

VoltAgentは、2つの補完的なツールを通じてAIエージェントを開発および監視するための完全なプラットフォームを提供します。

### コアフレームワーク

コアフレームワークを使用すると、任意のAIプロバイダーに接続しながら、メモリ、ツール、複数ステップのワークフローを備えたインテリジェントなエージェントを構築できます。専門化されたエージェントがスーパーバイザーの調整下で連携する洗練されたマルチエージェントシステムを作成します。

- **[コアランタイム](https://voltagent.dev/docs/agents/overview/) (`@voltagent/core`)**: 型付きの役割、ツール、メモリ、モデルプロバイダーを1か所で定義し、すべてを整理された状態に保ちます。
- **[ワークフローエンジン](https://voltagent.dev/docs/workflows/overview/)**: カスタム制御フローをつなぎ合わせる代わりに、複数ステップの自動化を宣言的に記述します。
- **[スーパーバイザーとサブエージェント](https://voltagent.dev/docs/agents/sub-agents/)**: タスクをルーティングし、同期を維持するスーパーバイザーランタイムの下で、専門化されたエージェントのチームを実行します。
- **[ツールレジストリ](https://voltagent.dev/docs/agents/tools/)と[MCP](https://voltagent.dev/docs/agents/mcp/)**: ライフサイクルフックとキャンセル機能を備えたZod型のツールを提供し、追加の接着コードなしで[Model Context Protocol](https://modelcontextprotocol.io/)サーバーに接続します。
- **[LLM互換性](https://voltagent.dev/docs/getting-started/providers-models/)**: エージェントロジックを書き直さずに、設定を変更するだけでOpenAI、Anthropic、Googleなどのプロバイダー間を切り替えます。
- **[メモリ](https://voltagent.dev/docs/agents/memory/overview/)**: 永続的なメモリアダプターを接続して、エージェントが実行間で重要なコンテキストを記憶できるようにします。
- **[検索とRAG](https://voltagent.dev/docs/rag/overview/)**: データソースから事実を取得し、モデルが回答する前に応答を根拠づける（RAG）レトリーバーエージェントをプラグインします。
- **[評価](https://voltagent.dev/docs/evals/overview/)**: ワークフローと並行してエージェント評価スイートを実行し、ガードレールをより速く提供します。

### VoltOps LLM可観測性プラットフォーム

VoltAgentには、詳細な実行トレース、パフォーマンスメトリクス、ビジュアルダッシュボードでエージェントをリアルタイムで監視およびデバッグするための組み込みの[VoltOps](#voltopsによる組み込みllm可観測性) LLM可観測性が付属しています。エージェントが行うすべての決定を検査し、ツールの使用を追跡し、組み込みのOpenTelemetryベースの可観測性でワークフローを最適化します。

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

![VoltAgent VoltOps Platform Demo](https://github.com/user-attachments/assets/0adbec33-1373-4cf4-b67d-825f7baf1cb4)

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

![VoltOps Workflow Observability](https://github.com/user-attachments/assets/9b877c65-f095-407f-9237-d7879964c38a)

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

## VoltOpsによる組み込みLLM可観測性

VoltAgentには、エージェントをリアルタイムで監視、デバッグ、最適化するのに役立つ組み込みのLLM可観測性プラットフォームであるVoltOpsが付属しています。

🎬 [ライブデモを試す](https://console.voltagent.dev/demo)

📖 [VoltOpsドキュメント](https://voltagent.dev/voltops-llm-observability-docs/)

🚀 [VoltOpsプラットフォーム](https://voltagent.dev/voltops-llm-observability/)

### 可観測性とトレース

詳細なトレースとパフォーマンスメトリクスでエージェントの実行フローを深く掘り下げます。

<br/>

![VoltOps Observability Overview](https://cdn.voltagent.dev/console/observability.png)

### ダッシュボード

すべてのエージェント、ワークフロー、システムパフォーマンスメトリクスの包括的な概要を取得します。

<br/>

![VoltOps Dashboard](https://cdn.voltagent.dev/console/dashboard.png)

### ログ

すべてのエージェントインタラクションとワークフローステップの詳細な実行ログを追跡します。
<br/>

![VoltOps Logs](https://cdn.voltagent.dev/console/logs.png)

### メモリ管理

エージェントのメモリ、コンテキスト、会話履歴を検査および管理します。

<br/>

![VoltOps Memory Overview](https://cdn.voltagent.dev/console/memory.png)

### トレース

エージェントの動作を理解し、パフォーマンスを最適化するために完全な実行トレースを分析します。

<br/>

![VoltOps Traces](https://cdn.voltagent.dev/console/traces.png)

### プロンプトビルダー

コンソールで直接プロンプトを設計、テスト、改良します。

<br/>

![VoltOps Prompt Builder](https://cdn.voltagent.dev/console/prompt.png)

## 例

完全なソースコードとビデオチュートリアルを備えたVoltAgentの実世界の実装を探索します。

より多くの例とユースケースについては、[例のリポジトリ](https://github.com/VoltAgent/voltagent/tree/main/examples)をご覧ください。

### WhatsApp注文エージェント

自然な会話を通じて食品注文を処理し、データベースからメニュー項目を管理し、完全な会話コンテキストで注文を処理するWhatsAppチャットボットを構築します。

<br/>

<img width="1111" height="347" alt="whatsapp" src="https://github.com/user-attachments/assets/dc9c4986-3e68-42f8-a450-ecd79b4dbd99" />

<br/>
<br/>

- 📖 [チュートリアル](https://voltagent.dev/examples/agents/whatsapp-ai-agent)
- 💻 [ソースコード](https://github.com/VoltAgent/voltagent/tree/main/examples/with-whatsapp)

### YouTube to ブログエージェント

MCPツール、共有ワーキングメモリ、VoltOps可観測性を備えたサブエージェントを調整するスーパーバイザーエージェントを使用して、YouTube動画をMarkdownブログ投稿に変換します。

<br/>

<img width="1113" height="363" alt="youtube" src="https://github.com/user-attachments/assets/f9c944cf-8a9a-4ac5-a5f9-860ce08f058b" />

<br/>
<br/>

- 📖 [チュートリアル](https://voltagent.dev/examples/agents/youtube-blog-agent)
- 💻 [ソースコード](https://github.com/VoltAgent/voltagent/tree/main/examples/with-youtube-to-blog)

### AI広告生成エージェント

BrowserBase Stagehandを使用してランディングページを分析し、ブランドデータを抽出し、Google Gemini AIを通じてビジュアルを生成するInstagram広告ジェネレーターを実装します。

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator">
<img width="1115" height="363" alt="instagram" src="https://github.com/user-attachments/assets/973e79c7-34ec-4f8e-8a41-9273d44234c6" />
</a>

<br/>
<br/>

- 📖 [チュートリアル](https://voltagent.dev/examples/agents/ai-instagram-ad-agent)
- 💻 [ソースコード](https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator)

### AIレシピ生成エージェント

利用可能な材料、食事の好み、時間制約に基づいてパーソナライズされた料理提案を作成するインテリジェントなレシピ推奨システムを構築します。

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator">
<img width="1111" height="363" alt="cook" src="https://github.com/user-attachments/assets/dde6ce2f-c963-4075-9825-f216bc6e3467" />
</a>

<br/>
<br/>

- 📖 [チュートリアル](https://voltagent.dev/examples/agents/recipe-generator)
- 📹 [ビデオを見る](https://youtu.be/KjV1c6AhlfY)
- 💻 [ソースコード](https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator)

### AI研究アシスタントエージェント

型安全なデータフローでトピックを研究し、包括的なレポートを生成するために、さまざまなAIエージェントが協力するマルチエージェント研究ワークフローを作成します。

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant">
<img width="2228" height="678" alt="research" src="https://github.com/user-attachments/assets/8f459748-132e-4ff3-9afe-0561fa5075c2" />
</a>

<br/>
<br/>

- 📖 [チュートリアル](https://voltagent.dev/examples/agents/research-assistant)
- 📹 [ビデオを見る](https://youtu.be/j6KAUaoZMy4)
- 💻 [ソースコード](https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant)

## ユースケース

さまざまな業界の実際のビジネスニーズに対応するAIエージェントを構築します：

- **[HRエージェント](https://voltagent.dev/use-cases/hr-agent/)** - 採用、従業員のオンボーディング、HRサポートタスクを自動化します。
- **[カスタマーサポートエージェント](https://voltagent.dev/use-cases/customer-support-agent/)** - 顧客の質問や問題を処理するサポートエージェントを構築します。
- **[営業チーム](https://voltagent.dev/use-cases/sales-teams/)** - リードを検証し、顧客データを収集し、営業アウトリーチをパーソナライズします。
- **[財務エージェント](https://voltagent.dev/use-cases/finance-agent/)** - 請求書を管理し、経費を追跡し、財務報告書を生成します。
- **[開発エージェント](https://voltagent.dev/use-cases/development-agent/)** - コードをレビューし、デプロイを管理し、開発チームを支援します。
- **[マーケティングエージェント](https://voltagent.dev/use-cases/marketing-agent/)** - キャンペーンを計画し、コンテンツを作成し、マーケティングパフォーマンスを分析します。
- **[法務エージェント](https://voltagent.dev/use-cases/legal-agent/)** - 契約をレビューし、コンプライアンスを確認し、法的タスクを処理します。
- **[保険エージェント](https://voltagent.dev/use-cases/insurance-agent/)** - 請求を処理し、リスクを評価し、ポリシーを管理します。
- **[産業エージェント](https://voltagent.dev/use-cases/industrial-agent/)** - 機器を監視し、メンテナンスニーズを予測し、安全性を確保します。
- **[教育エージェント](https://voltagent.dev/use-cases/education-agent/)** - パーソナライズされた指導を提供し、学生の進捗を追跡し、学習をサポートします。
- **[政府エージェント](https://voltagent.dev/use-cases/government-agent/)** - 許可申請を処理し、給付金を処理し、市民にサービスを提供します。
- **[ドキュメントエージェント](https://voltagent.dev/use-cases/documentation-agent/)** - APIドキュメントを作成し、変更ログを書き、コードからチュートリアルを生成します。

## VoltAgentを学ぶ

- 📖 **[インタラクティブチュートリアルから始める](https://voltagent.dev/tutorial/introduction/)**ことで、AIエージェント構築の基礎を学びます。
- **[ドキュメント](https://voltagent.dev/docs/)**: ガイド、概念、チュートリアルを深く掘り下げます。
- **[例](https://github.com/voltagent/voltagent/tree/main/examples)**: 実用的な実装を探索します。
- **[ブログ](https://voltagent.dev/blog/)**: 技術的な洞察とベストプラクティスについて詳しく読みます。

## 貢献

私たちは貢献を歓迎します！貢献ガイドラインを参照してください（利用可能な場合はリンクが必要）。質問や議論については、[Discord](https://s.voltagent.dev/discord)サーバーに参加してください。

## 貢献者 ♥️ ありがとう

プラグインを構築したり、イシューを開いたり、プルリクエストを提出したり、DiscordやGitHubディスカッションで誰かを助けたりして、VoltAgentの旅の一部となったすべての人に心から感謝します。

VoltAgentはコミュニティの努力であり、あなたのような人々のおかげで継続的に改善されています。

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent&max=100)

あなたのスターは、より多くの開発者にリーチするのに役立ちます！VoltAgentが役立つと思ったら、プロジェクトをサポートし、他の人が発見できるようにGitHubでスターを付けることを検討してください。

## ライセンス

MITライセンスの下でライセンスされています、Copyright © 2025-present VoltAgent.
