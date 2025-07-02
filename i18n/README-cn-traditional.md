<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>

<br/>
<br/>

<div align="center">
<a href="../README.md">English</a> | 繁體中文 | <a href="README-cn-bsc.md">简体中文</a> | <a href="README-jp.md">日本語</a> | <a href="README-kr.md">한국어</a>
</div>

<br/>

<div align="center">
    <a href="https://voltagent.dev">首頁</a> |
    <a href="https://voltagent.dev/docs/">文檔</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">範例</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">部落格</a>
</div>
</div>

<br/>

<div align="center">
    <strong>VoltAgent 是一個開源的 TypeScript 框架，用於構建和編排 AI 智能體。</strong><br>
擺脫無代碼構建器的局限性和從零開始的複雜性。
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

## 什麼是 VoltAgent？

> **AI 智能體框架**提供了構建由自主智能體驅動的應用程式所需的基礎結構和工具。這些智能體通常由大型語言模型（LLM）驅動，能夠感知環境、做出決策並採取行動來實現特定目標。從零開始構建此類智能體涉及管理與 LLM 的複雜交互、處理狀態、連接外部工具和數據，以及編排工作流程。

**VoltAgent** 是一個開源的 TypeScript 框架，作為這個重要的工具包。它通過提供模組化的構建塊、標準化模式和抽象來簡化 AI 智能體應用程式的開發。無論您是在創建聊天機器人、虛擬助手、自動化工作流程還是複雜的多智能體系統，VoltAgent 都能處理底層複雜性，讓您專注於定義智能體的能力和邏輯。

VoltAgent 提供現成的模組化構建塊，而不是從零開始構建所有內容：

- **核心引擎（`@voltagent/core`）**：VoltAgent 的核心，為您的 AI 智能體提供基本功能，定義具有特定角色、工具和記憶的個別智能體。
- **多智能體系統**：通過使用監督者協調多個專業智能體來構建複雜的應用程式。
- **可擴展包**：使用 `@voltagent/voice` 等包增強語音交互功能。
- **工具和集成**：為智能體配備工具以連接外部 API、數據庫和服務，使其能夠執行實際任務。**支援[模型上下文協議（MCP）](https://modelcontextprotocol.io/)用於標準化工具交互。**
- **數據檢索和 RAG**：實施專門的檢索器智能體以實現高效的信息獲取和**檢索增強生成（RAG）**。
- **記憶**：使智能體能夠記住過去的交互，以實現更自然和上下文感知的對話。
- **LLM 兼容性**：與來自 OpenAI、Google、Anthropic 等流行 AI 模型配合使用，允許輕鬆切換。
- **開發者生態系統**：包括 `create-voltagent-app`、`@voltagent/cli` 和可視化 [VoltOps LLM 可觀察性平台](https://console.voltagent.dev) 等助手，用於快速設置、監控和調試。

總之，VoltAgent 幫助開發者更快、更可靠地構建複雜的 AI 應用程式，避免重複設置和簡單工具的限制。

## 為什麼選擇 VoltAgent？

構建 AI 應用程式通常涉及權衡：

1.  **DIY 方法：**使用基本的 AI 提供商工具提供控制權，但會導致複雜、難以管理的代碼和重複工作。
2.  **無代碼構建器：**最初更簡單，但通常限制性強，限制自定義、提供商選擇和複雜性。

VoltAgent 提供了中間地帶，在不犧牲靈活性的情況下提供結構和組件：

- **更快構建：**與從零開始相比，使用預構建組件加速開發。
- **可維護代碼：**鼓勵組織以便於更新和調試。
- **可擴展性：**從簡單開始，輕鬆擴展到處理復雜工作流程的複雜多智能體系統。
- **靈活性：**完全控制智能體行為、LLM 選擇、工具集成和 UI 連接。
- **避免鎖定：**根據需要自由切換 AI 提供商和模型。
- **成本效率：**旨在優化 AI 服務使用並減少冗餘調用的功能。
- **可視化監控：**使用 [VoltOps LLM 可觀察性平台](https://console.voltagent.dev) 跟踪智能體性能、檢查狀態並進行可視化調試。

VoltAgent 使開發者能夠高效地構建他們設想的 AI 應用程式，從簡單的助手到複雜的系統。

## ⚡ 快速開始

使用 `create-voltagent-app` CLI 工具在幾秒鐘內創建新的 VoltAgent 項目：

```bash
npm create voltagent-app@latest
```

此命令引導您完成設置。

您將在 `src/index.ts` 中看到起始代碼，幫助您開始使用 VoltAgent 框架。

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai"; // 示例提供商
import { openai } from "@ai-sdk/openai"; // 示例模型

// 定義一個簡單的智能體
const agent = new Agent({
  name: "my-agent",
  instructions: "一個有用的助手，無需使用工具即可回答問題",
  // 注意：您可以將 VercelAIProvider 和 openai 替換為其他支援的提供商/模型
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// 使用您的智能體初始化 VoltAgent
new VoltAgent({
  agents: {
    agent,
  },
});
```

之後，導航到您的項目並運行：

```bash
npm run dev
```

當您運行 dev 命令時，tsx 將編譯並運行您的代碼。您應該在終端中看到 VoltAgent 伺服器啟動消息：

```
══════════════════════════════════════════════════
VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
✓ HTTP Server: http://localhost:3141

Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
```

您的智能體現在正在運行！要與其交互：

1. 打開控制台：點擊終端輸出中的 [VoltOps LLM 可觀察性平台](https://console.voltagent.dev) 鏈接（或將其複製粘貼到瀏覽器中）。
2. 找到您的智能體：在 VoltOps LLM 可觀察性平台頁面上，您應該看到您的智能體列出（例如，"my-agent"）。
3. 打開智能體詳情：點擊您的智能體名稱。
4. 開始聊天：在智能體詳情頁面上，點擊右下角的聊天圖標打開聊天窗口。
5. 發送消息：輸入消息如"您好"並按 Enter。

[![VoltAgent VoltOps Platform Demo](https://github.com/user-attachments/assets/0adbec33-1373-4cf4-b67d-825f7baf1cb4)](https://console.voltagent.dev/)

## 主要功能

- **智能體核心：**使用描述、LLM 提供商、工具和記憶管理定義智能體。
- **多智能體系統：**使用監督者智能體協調多個專業子智能體構建複雜的工作流程。
- **工具使用和生命週期：**為智能體配備自定義或預構建的工具（函數），具有類型安全性（Zod）、生命週期鉤子和取消支援，以與外部系統交互。
- **靈活的 LLM 支援：**與各種 LLM 提供商（OpenAI、Anthropic、Google 等）無縫集成，並輕鬆切換模型。
- **記憶管理：**使智能體能夠使用不同的可配置記憶提供商在交互之間保留上下文。
- **可觀察性和調試：**通過 [VoltOps LLM 可觀察性平台](https://console.voltagent.dev) 可視化監控智能體狀態、交互、日誌和性能。
- **自定義 API 端點：**使用您自己的自定義端點擴展 VoltAgent API 伺服器，在核心框架之上構建專門功能。
- **語音交互：**使用 `@voltagent/voice` 包構建能夠語音識別和合成的語音啟用智能體。
- **數據檢索和 RAG：**集成專門的檢索器智能體，從各種來源實現高效的信息獲取和**檢索增強生成（RAG）**。
- **模型上下文協議（MCP）支援：**連接到遵循 [MCP 標準](https://modelcontextprotocol.io/) 的外部工具伺服器（HTTP/stdio）以獲得擴展功能。
- **提示工程工具：**利用 `createPrompt` 等工具為您的智能體製作和管理有效的提示。
- **框架兼容性：**設計用於輕鬆集成到現有 Node.js 應用程式和流行框架中。

## 使用案例

VoltAgent 多功能，可為各種 AI 驅動的應用程式提供動力：

- **複雜工作流程自動化：**使用協調智能體編排涉及各種工具、API 和決策點的多步驟流程。
- **智能數據管道：**構建從不同來源獲取、處理、分析和轉換數據的智能體。
- **AI 驅動的內部工具和儀錶板：**創建利用 AI 進行分析、報告或任務自動化的交互式內部應用程式，通常使用鉤子與 UI 集成。
- **自動化客戶支援智能體：**開發能夠理解上下文（記憶）、使用工具（例如檢查訂單狀態）並升級複雜問題的複雜聊天機器人。
- **存儲庫分析和代碼庫自動化：**分析代碼存儲庫、自動化重構任務、生成文檔或管理 CI/CD 流程。
- **檢索增強生成（RAG）系統：**構建在生成知情響應之前從知識庫檢索相關信息（使用檢索器智能體）的智能體。
- **語音控制界面和應用程式：**利用 `@voltagent/voice` 包創建響應和生成口語的應用程式。
- **個性化用戶體驗：**開發根據存儲在記憶中的用戶歷史和偏好調整響應和操作的智能體。
- **實時監控和警報：**設計持續監控數據流或系統並根據定義條件觸發操作或通知的智能體。
- **以及幾乎任何其他事情...**：如果您能想像 AI 智能體做這件事，VoltAgent 可能可以幫助您構建它！⚡

## 學習 VoltAgent

- **[文檔](https://voltagent.dev/docs/)**：深入了解指南、概念和教程。
- **[範例](https://github.com/voltagent/voltagent/tree/main/examples)**：探索實際實施。
- **[部落格](https://voltagent.dev/blog/)**：閱讀更多技術見解和最佳實踐。

## 貢獻

我們歡迎貢獻！請參考貢獻指南（如果可用，需要鏈接）。加入我們的 [Discord](https://s.voltagent.dev/discord) 伺服器進行問題和討論。

## 貢獻者 ♥️ 感謝

非常感謝每個參與 VoltAgent 之旅的人，無論您是構建了插件、開啟了問題、提交了拉取請求，還是只是在 Discord 或 GitHub 討論中幫助了某人。

VoltAgent 是一個社區努力，因為有您這樣的人，它一直在變得更好。

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent)

您的星星幫助我們接觸更多開發者！如果您發現 VoltAgent 有用，請考慮在 GitHub 上給我們一個星星以支持項目並幫助其他人發現它。

## 許可證

根據 MIT 許可證授權，版權所有 © 2025 至今 VoltAgent。
