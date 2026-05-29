<div align="center">
<a href="https://voltagent.dev/">
<img width="1500" height="276" alt="voltagent" src="https://github.com/user-attachments/assets/d9ad69bd-b905-42a3-81af-99a0581348c0" />
</a>

<h3 align="center">
AI Agent 工程平台
</h3>

<div align="center">
<a href="../README.md">English</a> | 繁體中文 | <a href="README-cn-bsc.md">简体中文</a> | <a href="README-jp.md">日本語</a> | <a href="README-kr.md">한국어</a>
</div>

<br/>

<div align="center">
    <a href="https://voltagent.dev">首頁</a> |
    <a href="https://voltagent.dev/docs/">文檔</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">範例</a>
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
⭐ 喜歡我們的專案嗎？給我們一個星標 ⬆️
</h3>

VoltAgent 是一個端到端的 AI Agent 工程平台，由兩個主要部分組成：

- **[開源 TypeScript 框架](#core-framework)** – Memory、RAG、Guardrails、Tools、MCP、Voice、Workflow 等。
- **[VoltOps 控制台](#voltops-console)** `Cloud` `Self-Hosted` – 可觀測性、自動化、部署、評估、安全護欄、提示詞等。

以完全的程式碼控制構建代理，並以生產就緒的可視化和操作來發布它們。

<h2 id="core-framework">核心 TypeScript 框架</h2>

使用開源框架，您可以構建具有記憶、工具和多步驟工作流程的智慧代理，同時連接到任何 AI 提供商。創建專業代理在監督協調下協同工作的精密多代理系統。

- **[核心運行時](https://voltagent.dev/docs/agents/overview/) (`@voltagent/core`)**：在一個地方定義具有類型化角色、工具、記憶和模型提供商的代理，使一切保持有序。
- **[工作流程引擎](https://voltagent.dev/docs/workflows/overview/)**：聲明式描述多步驟自動化，而不是拼接自定義控制流程。
- **[監督者與子代理](https://voltagent.dev/docs/agents/sub-agents/)**：在監督運行時下運行專業代理團隊，該運行時路由任務並保持它們同步。
- **[工具註冊表](https://voltagent.dev/docs/agents/tools/)與 [MCP](https://voltagent.dev/docs/agents/mcp/)**：提供具有生命週期鉤子和取消功能的 Zod 類型工具，並無需額外粘合代碼即可連接到 [Model Context Protocol](https://modelcontextprotocol.io/) 伺服器。
- **[LLM 兼容性](https://voltagent.dev/docs/getting-started/providers-models/)**：通過更改配置而不是重寫代理邏輯，在 OpenAI、Anthropic、Google 或其他提供商之間切換。
- **[記憶](https://voltagent.dev/docs/agents/memory/overview/)**：附加持久記憶適配器，使代理能夠跨運行記住重要上下文。
- **[檢索與 RAG](https://voltagent.dev/docs/rag/overview/)**：插入檢索器代理，從您的數據源提取事實並在模型回答之前奠定響應基礎（RAG）。
- **[VoltAgent 知識庫](https://voltagent.dev/docs/rag/voltagent/)**：使用託管的 RAG 服務進行文檔攝入、分塊、嵌入和搜索。
- **[語音](https://voltagent.dev/docs/agents/voice/)**：使用 OpenAI、ElevenLabs 或自定義語音提供商添加文字轉語音和語音轉文字功能。
- **[安全護欄](https://voltagent.dev/docs/guardrails/overview/)**：在運行時攔截和驗證代理輸入或輸出，以執行內容策略和安全規則。
- **[評估](https://voltagent.dev/docs/evals/overview/)**：與您的工作流程一起運行代理評估套件，以衡量和改進代理行為。

#### MCP 伺服器 (@voltagent/mcp-docs-server)

您可以使用 MCP 伺服器 `@voltagent/mcp-docs-server` 來教導 LLM 如何使用 VoltAgent，用於 Claude、Cursor 或 Windsurf 等 AI 驅動的編碼助手。這允許 AI 助手在您編碼時直接訪問 VoltAgent 文檔、範例和變更日誌。

📖 [如何設定 MCP 文檔伺服器](https://voltagent.dev/docs/getting-started/mcp-docs-server/)

## ⚡ 快速開始

使用 `create-voltagent-app` CLI 工具在幾秒鐘內創建新的 VoltAgent 專案：

```bash
npm create voltagent-app@latest
```

此命令將引導您完成設定。

您將在 `src/index.ts` 中看到入門程式碼，該程式碼現在註冊了代理和全面的工作流程範例，工作流程範例位於 `src/workflows/index.ts` 中。

```typescript
import { VoltAgent, Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { openai } from "@ai-sdk/openai";
import { expenseApprovalWorkflow } from "./workflows";
import { weatherTool } from "./tools";

// 創建日誌記錄器實例
const logger = createPinoLogger({
  name: "my-agent-app",
  level: "info",
});

// 可選的持久記憶（刪除以使用預設的記憶體內）
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
});

// 專案的簡單通用代理
const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant that can check weather and help with various tasks",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  memory,
});

// 使用代理和工作流程初始化 VoltAgent
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

之後，導航到您的專案並運行：

```bash
npm run dev
```

運行 dev 命令時，tsx 將編譯並運行您的程式碼。您應該在終端中看到 VoltAgent 伺服器啟動訊息：

```
══════════════════════════════════════════════════
VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
✓ HTTP Server: http://localhost:3141

Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
```

您的代理現在正在運行！要與其互動：

1. 打開控制台：點擊終端輸出中的 [VoltOps LLM 可觀測性平台](https://console.voltagent.dev) 連結（或複製並貼上到瀏覽器）。
2. 找到您的代理：在 VoltOps LLM 可觀測性平台頁面上，您應該會看到列出的代理（例如「my-agent」）。
3. 打開代理詳情：點擊代理名稱。
4. 開始聊天：在代理詳情頁面上，點擊右下角的聊天圖示以打開聊天視窗。
5. 發送訊息：輸入「你好」之類的訊息並按 Enter。

[![VoltAgent Demo](https://github.com/user-attachments/assets/26340c6a-be34-48a5-9006-e822bf6098a7)](https://github.com/user-attachments/assets/26340c6a-be34-48a5-9006-e822bf6098a7)

### 運行您的第一個工作流程

您的新專案還包括一個強大的工作流程引擎。

費用批准工作流程演示了具有暫停/恢復功能的人機協作自動化：

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
  // 步驟 1：驗證費用並檢查是否需要批准
  .andThen({
    id: "check-approval-needed",
    resumeSchema: z.object({
      approved: z.boolean(),
      managerId: z.string(),
      comments: z.string().optional(),
      adjustedAmount: z.number().optional(),
    }),
    execute: async ({ data, suspend, resumeData }) => {
      // 如果我們正在恢復經理的決定
      if (resumeData) {
        return {
          ...data,
          approved: resumeData.approved,
          approvedBy: resumeData.managerId,
          finalAmount: resumeData.adjustedAmount || data.amount,
        };
      }

      // 檢查是否需要經理批准（超過 $500 的費用）
      if (data.amount > 500) {
        await suspend("Manager approval required", {
          employeeId: data.employeeId,
          requestedAmount: data.amount,
        });
      }

      // 自動批准小額費用
      return {
        ...data,
        approved: true,
        approvedBy: "system",
        finalAmount: data.amount,
      };
    },
  })
  // 步驟 2：處理最終決定
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

您可以直接從 VoltOps 控制台測試預建的 `expenseApprovalWorkflow`：

[![expense-approval](https://github.com/user-attachments/assets/3d3ea67b-4ab5-4dc0-932d-cedd92894b18)](https://github.com/user-attachments/assets/3d3ea67b-4ab5-4dc0-932d-cedd92894b18)

1.  **前往工作流程頁面**：啟動伺服器後，直接前往[工作流程頁面](https://console.voltagent.dev/workflows)。
2.  **選擇您的專案**：使用專案選擇器選擇您的專案（例如「my-agent-app」）。
3.  **查找並運行**：您將看到列出的 **"Expense Approval Workflow"**。點擊它，然後點擊 **"Run"** 按鈕。
4.  **提供輸入**：工作流程期望包含費用詳情的 JSON 物件。嘗試小額費用以進行自動批准：
    ```json
    {
      "employeeId": "EMP-123",
      "amount": 250,
      "category": "office-supplies",
      "description": "New laptop mouse and keyboard"
    }
    ```
5.  **查看結果**：執行後，您可以檢查每個步驟的詳細日誌，並直接在控制台中查看最終輸出。

## 範例

有關更多範例，請訪問我們的[範例存儲庫](https://github.com/VoltAgent/voltagent/tree/main/examples)。

- **[Airtable 代理](https://voltagent.dev/recipes-and-guides/airtable-agent)** - 響應新記錄並通過 VoltOps 操作將更新寫回 Airtable。
- **[Slack 代理](https://voltagent.dev/recipes-and-guides/slack-agent)** - 響應頻道訊息並通過 VoltOps Slack 操作進行回覆。
- **[ChatGPT 應用與 VoltAgent](https://voltagent.dev/examples/agents/chatgpt-app)** - 通過 MCP 部署 VoltAgent 並連接到 ChatGPT 應用。
- **[WhatsApp 訂單代理](https://voltagent.dev/examples/agents/whatsapp-ai-agent)** - 構建一個 WhatsApp 聊天機器人，通過自然對話處理食品訂單。([原始碼](https://github.com/VoltAgent/voltagent/tree/main/examples/with-whatsapp))
- **[YouTube 轉部落格代理](https://voltagent.dev/examples/agents/youtube-blog-agent)** - 使用監督者代理與 MCP 工具將 YouTube 視訊轉換為 Markdown 部落格文章。([原始碼](https://github.com/VoltAgent/voltagent/tree/main/examples/with-youtube-to-blog))
- **[AI 廣告生成代理](https://voltagent.dev/examples/agents/ai-instagram-ad-agent)** - 使用 BrowserBase Stagehand 和 Google Gemini AI 生成 Instagram 廣告。([原始碼](https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator))
- **[AI 食譜生成代理](https://voltagent.dev/examples/agents/recipe-generator)** - 根據食材和偏好創建個性化烹飪建議。([原始碼](https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator) | [視訊](https://youtu.be/KjV1c6AhlfY))
- **[AI 研究助手代理](https://voltagent.dev/examples/agents/research-assistant)** - 用於生成全面報告的多代理研究工作流程。([原始碼](https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant) | [視訊](https://youtu.be/j6KAUaoZMy4))

<h2 id="voltops-console">VoltOps 控制台：LLM 可觀測性 - 自動化 - 部署</h2>

VoltOps 控制台是 VoltAgent 的平台端，提供可觀測性、自動化和部署功能，讓您可以通過實時執行追蹤、效能指標和可視化儀表板在生產環境中監控和調試代理。

🎬 [試用即時演示](https://console.voltagent.dev/demo)

📖 [VoltOps 文檔](https://voltagent.dev/voltops-llm-observability-docs/)

🚀 [VoltOps 平台](https://voltagent.dev/voltops-llm-observability/)

### 可觀測性與追蹤

通過詳細的追蹤和效能指標深入了解代理執行流程。

<img alt="1" src="https://github.com/user-attachments/assets/21c6d05d-f333-4c61-9218-8862d16110fd" />

### 儀表板

獲取所有代理、工作流程和系統效能指標的全面概覽。

<img alt="dashboard" src="https://github.com/user-attachments/assets/c88a5543-219e-4cf0-8f41-14a68ca297fb" />

### 日誌

追蹤每個代理互動和工作流程步驟的詳細執行日誌。

![VoltOps Logs](https://cdn.voltagent.dev/console/logs.png)

### 記憶管理

檢查和管理代理記憶、上下文和對話歷史。

![VoltOps Memory Overview](https://cdn.voltagent.dev/console/memory.png)

### 追蹤

分析完整的執行追蹤以了解代理行為並優化效能。

![VoltOps Traces](https://cdn.voltagent.dev/console/traces.png)

### 提示生成器

直接在控制台中設計、測試和改進提示。

<img  alt="prompts" src="https://github.com/user-attachments/assets/fb6d71eb-8f81-4443-a494-08c33ec9bcc4" />

### 部署

透過一鍵 GitHub 整合和託管基礎設施將您的代理部署到生產環境。

<img alt="deployment" src="https://github.com/user-attachments/assets/e329ab4b-7464-435a-96cc-90214e8a3cfa" />

📖 [VoltOps 部署文檔](https://voltagent.dev/docs/deployment/voltops/)

### 觸發器與操作

使用 webhooks、計劃和自定義觸發器自動化代理工作流程，以響應外部事件。

<img width="1277"  alt="triggers" src="https://github.com/user-attachments/assets/67e36934-2eb5-4cf1-94f8-3057d805ef65" />

### 監控

監控整個系統的代理健康狀況、效能指標和資源使用情況。

<img  alt="monitoring" src="https://github.com/user-attachments/assets/1fd1151f-5ee4-4c7c-8ec7-29874e37c48f" />

### 安全護欄

設置安全邊界和內容過濾器，確保代理在定義的參數範圍內運行。

<img  alt="guardrails" src="https://github.com/user-attachments/assets/52bd51f0-944e-4202-9f54-7bb2e0e2d1f6" />

### 評估

運行評估套件以測試代理行為、準確性和效能基準。

<img  alt="evals" src="https://github.com/user-attachments/assets/510cc180-2661-4973-a48f-074d4703d90b" />

### RAG（知識庫）

將您的代理連接到知識源，具有內建的檢索增強生成功能。

<img  alt="rag" src="https://github.com/user-attachments/assets/a6c2f668-7ad1-4fb6-b67f-654335285f1e" />

## 學習 VoltAgent

- **[從互動式教程開始](https://voltagent.dev/tutorial/introduction/)** 以學習構建 AI 代理的基礎知識。
- **[文檔](https://voltagent.dev/docs/)**：深入了解指南、概念和教程。
- **[範例](https://github.com/voltagent/voltagent/tree/main/examples)**：探索實際實現。
- **[部落格](https://voltagent.dev/blog/)**：閱讀更多技術見解和最佳實踐。

## 貢獻

我們歡迎貢獻！請參閱貢獻指南（如有需要提供連結）。加入我們的 [Discord](https://s.voltagent.dev/discord) 伺服器進行問題討論。

## 貢獻者 ♥️ 感謝

非常感謝所有參與 VoltAgent 旅程的人，無論您是構建插件、提出問題、提交拉取請求，還是只是在 Discord 或 GitHub 討論中幫助他人。

VoltAgent 是一項社群努力，正是因為有像您這樣的人，它才不斷變得更好。

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent&max=500&columns=20&anon=1)

## 許可證

在 MIT 許可證下授權，Copyright © 2026-present VoltAgent。
