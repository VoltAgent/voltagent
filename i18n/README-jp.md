<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
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
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">サンプル</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">ブログ</a>
</div>
</div>

<br/>

<div align="center">
    <strong>VoltAgent は AI エージェントの構築と編成を行うオープンソースの TypeScript フレームワークです。</strong><br>
ノーコードビルダーの制限やゼロから始める複雑さから解放されます。
    <br />
    <br />
</div>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)

</div>

<br/>

<div align="center">
<a href="https://voltagent.dev/">
<img width="896" alt="flow" src="https://github.com/user-attachments/assets/f0627868-6153-4f63-ba7f-bdfcc5dd603d" />
</a>

</div>

## VoltAgent とは？

> **AI エージェントフレームワーク**は、自律エージェントによって駆動されるアプリケーションを構築するために必要な基盤構造とツールを提供します。これらのエージェントは、しばしば大規模言語モデル（LLM）によって駆動され、環境を認識し、決定を下し、特定の目標を達成するための行動を取ることができます。このようなエージェントをゼロから構築するには、LLM との複雑な相互作用の管理、状態の処理、外部ツールやデータへの接続、ワークフローの編成が必要です。

**VoltAgent** は、この重要なツールキットとして機能するオープンソースの TypeScript フレームワークです。モジュラーな構築ブロック、標準化されたパターン、抽象化を提供することで AI エージェントアプリケーションの開発を簡素化します。チャットボット、バーチャルアシスタント、自動化ワークフロー、複雑なマルチエージェントシステムのいずれを作成する場合でも、VoltAgent は基盤の複雑さを処理し、エージェントの能力とロジックの定義に集中することができます。

VoltAgent は、すべてをゼロから構築するのではなく、すぐに使えるモジュラーな構築ブロックを提供します：

- **コアエンジン（`@voltagent/core`）**：VoltAgent の中心であり、AI エージェントの基本機能を提供し、特定の役割、ツール、メモリを持つ個別のエージェントを定義します。
- **マルチエージェントシステム**：スーパーバイザーを使用して複数の専門エージェントを調整することで、複雑なアプリケーションを構築します。
- **拡張可能パッケージ**：音声インタラクション用の `@voltagent/voice` などのパッケージで機能を強化します。
- **ツールと統合**：エージェントに外部 API、データベース、サービスに接続するツールを装備し、実世界のタスクを実行できるようにします。**標準化されたツールインタラクションのための[モデルコンテキストプロトコル（MCP）](https://modelcontextprotocol.io/)をサポートします。**
- **データ検索と RAG**：効率的な情報取得と**検索拡張生成（RAG）**のための専門的なリトリーバーエージェントを実装します。
- **メモリ**：エージェントが過去のインタラクションを記憶し、より自然でコンテキストを認識した会話を可能にします。
- **LLM 互換性**：OpenAI、Google、Anthropic などの人気 AI モデルと連携し、簡単に切り替えることができます。
- **デベロッパーエコシステム**：`create-voltagent-app`、`@voltagent/cli`、ビジュアルな [VoltOps LLM 可観測性プラットフォーム](https://console.voltagent.dev) などのヘルパーを含み、迅速なセットアップ、監視、デバッグを提供します。

要するに、VoltAgent はデベロッパーがより速く、より信頼性の高い複雑な AI アプリケーションを構築し、反復的なセットアップやシンプルなツールの制限を回避するのを支援します。

## なぜ VoltAgent なのか？

AI アプリケーションの構築には、しばしばトレードオフが伴います：

1.  **DIY アプローチ：**基本的な AI プロバイダーツールの使用は制御を提供しますが、複雑で管理しにくいコードと反復的な作業につながります。
2.  **ノーコードビルダー：**最初はシンプルですが、しばしば制限的で、カスタマイゼーション、プロバイダーの選択、複雑さを制限します。

VoltAgent は、柔軟性を犠牲にすることなく構造とコンポーネントを提供する中間的な解決策を提供します：

- **より高速な構築：**ゼロから始めるのと比較して、事前構築されたコンポーネントで開発を加速します。
- **保守可能なコード：**アップデートやデバッグを容易にする組織化を促進します。
- **スケーラビリティ：**シンプルから始めて、複雑なワークフローを処理する複雑なマルチエージェントシステムに簡単にスケールします。
- **柔軟性：**エージェントの動作、LLM の選択、ツール統合、UI 接続を完全に制御します。
- **ロックイン回避：**必要に応じて AI プロバイダーやモデルを自由に切り替える自由があります。
- **コスト効率：**AI サービスの使用を最適化し、冗長な呼び出しを削減するよう設計された機能。
- **ビジュアル監視：**[VoltOps LLM 可観測性プラットフォーム](https://console.voltagent.dev) を使用してエージェントのパフォーマンスを追跡し、状態を検査し、視覚的にデバッグします。

VoltAgent は、デベロッパーがシンプルなヘルパーから複雑なシステムまで、構想した AI アプリケーションを効率的に構築することを可能にします。

## ⚡ クイックスタート

`create-voltagent-app` CLI ツールを使用して、数秒で新しい VoltAgent プロジェクトを作成します：

```bash
npm create voltagent-app@latest
```

このコマンドはセットアップをガイドします。

VoltAgent フレームワークを開始するための初期コードが `src/index.ts` に表示されます。

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { openai } from "@ai-sdk/openai"; // サンプルモデル

// シンプルなエージェントを定義
const agent = new Agent({
  name: "my-agent",
  instructions: "ツールを使用せずに質問に答える有用なアシスタント",
  model: openai("gpt-4o-mini"),
});

// エージェントで VoltAgent を初期化
new VoltAgent({
  agents: {
    agent,
  },
  server: honoServer(),
});
```

その後、プロジェクトに移動して実行します：

```bash
npm run dev
```

dev コマンドを実行すると、tsx がコードをコンパイルして実行します。ターミナルに VoltAgent サーバーの起動メッセージが表示されるはずです：

```
══════════════════════════════════════════════════
VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
✓ HTTP Server: http://localhost:3141

Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
```

エージェントが動作しています！それとインタラクションするには：

1. コンソールを開く：ターミナル出力の [VoltOps LLM 可観測性プラットフォーム](https://console.voltagent.dev) リンクをクリック（またはブラウザにコピペ）します。
2. エージェントを見つける：VoltOps LLM 可観測性プラットフォームページで、エージェントがリストされているのが見えるはずです（例：「my-agent」）。
3. エージェント詳細を開く：エージェント名をクリックします。
4. チャットを開始：エージェント詳細ページで、右下角のチャットアイコンをクリックしてチャットウィンドウを開きます。
5. メッセージを送信：「こんにちは」のようなメッセージを入力して Enter を押します。

[![VoltAgent VoltOps Platform Demo](https://github.com/user-attachments/assets/0adbec33-1373-4cf4-b67d-825f7baf1cb4)](https://console.voltagent.dev/)

## 主要機能

- **エージェントコア：**説明、LLM プロバイダー、ツール、メモリ管理でエージェントを定義します。
- **マルチエージェントシステム：**複数の専門サブエージェントを調整するスーパーバイザーエージェントを使用して複雑なワークフローを構築します。
- **ツール使用とライフサイクル：**型安全性（Zod）、ライフサイクルフック、キャンセルサポートを持つカスタムまたは事前構築ツール（関数）でエージェントを装備し、外部システムとインタラクションします。
- **柔軟な LLM サポート：**様々な LLM プロバイダー（OpenAI、Anthropic、Google など）とシームレスに統合し、モデル間を簡単に切り替えます。
- **メモリ管理：**異なる設定可能なメモリプロバイダーを使用して、エージェントがインタラクション間でコンテキストを保持できるようにします。
- **可観測性とデバッグ：**[VoltOps LLM 可観測性プラットフォーム](https://console.voltagent.dev) を通じてエージェントの状態、インタラクション、ログ、パフォーマンスを視覚的に監視します。
- **カスタム API エンドポイント：**独自のカスタムエンドポイントで VoltAgent API サーバーを拡張し、コアフレームワークの上に専門機能を構築します。
- **音声インタラクション：**`@voltagent/voice` パッケージを使用して音声認識と合成が可能な音声対応エージェントを構築します。
- **データ検索と RAG：**様々なソースからの効率的な情報取得と**検索拡張生成（RAG）**のための専門リトリーバーエージェントを統合します。
- **モデルコンテキストプロトコル（MCP）サポート：**拡張機能のために [MCP 標準](https://modelcontextprotocol.io/) に準拠した外部ツールサーバー（HTTP/stdio）に接続します。
- **プロンプトエンジニアリングツール：**エージェントの効果的なプロンプトを作成・管理するために `createPrompt` などのユーティリティを活用します。
- **フレームワーク互換性：**既存の Node.js アプリケーションや人気フレームワークへの簡単な統合のために設計されています。

## ユースケース

VoltAgent は多機能で、幅広い AI 駆動アプリケーションを強化できます：

- **複雑なワークフロー自動化：**調整されたエージェントを使用して、様々なツール、API、決定ポイントを含む多段階プロセスを編成します。
- **インテリジェントデータパイプライン：**多様なソースからデータを取得、処理、分析、変換するエージェントを構築します。
- **AI 駆動の内部ツールとダッシュボード：**分析、レポート、タスク自動化にAIを活用するインタラクティブな内部アプリケーションを作成し、しばしばフックを使用して UI と統合されます。
- **自動化カスタマーサポートエージェント：**コンテキスト（メモリ）を理解し、ツール（例：注文状況確認）を使用し、複雑な問題をエスカレーションできる高度なチャットボットを開発します。
- **リポジトリ分析とコードベース自動化：**コードリポジトリを分析し、リファクタリングタスクを自動化し、ドキュメントを生成し、CI/CD プロセスを管理します。
- **検索拡張生成（RAG）システム：**情報に基づいた応答を生成する前に、ナレッジベースから関連情報を検索する（リトリーバーエージェントを使用）エージェントを構築します。
- **音声制御インターフェースとアプリケーション：**`@voltagent/voice` パッケージを活用して音声言語に応答し生成するアプリケーションを作成します。
- **パーソナライズされたユーザー体験：**メモリに保存されたユーザーの履歴と好みに基づいて応答と行動を適応させるエージェントを開発します。
- **リアルタイム監視とアラート：**データストリームやシステムを継続的に監視し、定義された条件に基づいてアクションや通知をトリガーするエージェントを設計します。
- **そして事実上その他何でも...**：AI エージェントがそれを行うことを想像できるなら、VoltAgent はそれを構築するのを助けることができるでしょう！⚡

## VoltAgent を学ぶ

- **[ドキュメント](https://voltagent.dev/docs/)**：ガイド、概念、チュートリアルを深く学習します。
- **[サンプル](https://github.com/voltagent/voltagent/tree/main/examples)**：実践的な実装を探索します。
- **[ブログ](https://voltagent.dev/blog/)**：技術的洞察とベストプラクティスについてさらに読みます。

## 貢献

私たちは貢献を歓迎します！貢献ガイドライン（利用可能な場合はリンクが必要）を参照してください。質問やディスカッションのために [Discord](https://s.voltagent.dev/discord) サーバーに参加してください。

## 貢献者 ♥️ ありがとう

プラグインを構築したり、問題を開いたり、プルリクエストを出したり、Discord や GitHub Discussions で誰かを助けたりと、VoltAgent の旅の一部となっているすべての人に心から感謝します。

VoltAgent はコミュニティの取り組みであり、あなたのような人々のおかげでより良くなり続けています。

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent)

あなたのスターは私たちがより多くのデベロッパーにリーチするのを助けます！VoltAgent が有用だと思われる場合は、プロジェクトをサポートし、他の人がそれを発見するのを助けるために GitHub でスターを付けることを検討してください。

## ライセンス

MIT ライセンスの下でライセンス供与、Copyright © 2025-present VoltAgent。
