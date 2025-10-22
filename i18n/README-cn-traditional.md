<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/9259e833-0f5c-4eb6-8cc7-4e6930cc27e1" />
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
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">範例</a>
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

**VoltAgent** 是一個開源的 TypeScript 框架，用於構建和編排 AI 代理。
您可以構建具有記憶、工作流程、工具和內建 LLM 可觀測性的生產就緒代理。

## 為什麼選擇 VoltAgent？

- **從第一天就準備好生產環境**：部署具有內建記憶、工作流程和可觀測性的代理，而無需從頭開始構建基礎設施。
- **自信編碼**：全面的 TypeScript 支援，具有類型安全的工具、自動推斷和整個代理系統的編譯時安全性。
- **像專業人士一樣調試**：內建的 VoltOps 可觀測性讓您追蹤每個決策、監控效能並即時優化工作流程，無需外部工具。
- **簡單構建複雜系統**：使用監督協調、聲明式工作流程和模組化架構編排多代理團隊，從原型擴展到生產環境。

## 代理開發平台

VoltAgent 通過兩個互補的工具提供完整的開發和監控 AI 代理平台。

### 核心框架

使用核心框架，您可以構建具有記憶、工具和多步驟工作流程的智能代理，同時連接到任何 AI 提供商。創建專業代理在監督協調下協同工作的精密多代理系統。

- **[核心運行時](https://voltagent.dev/docs/agents/overview/) (`@voltagent/core`)**：在一個地方定義具有類型化角色、工具、記憶和模型提供商的代理，使一切保持有序。
- **[工作流程引擎](https://voltagent.dev/docs/workflows/overview/)**：聲明式描述多步驟自動化，而不是拼接自定義控制流程。
- **[監督者與子代理](https://voltagent.dev/docs/agents/sub-agents/)**：在監督運行時下運行專業代理團隊，該運行時路由任務並保持它們同步。
- **[工具註冊表](https://voltagent.dev/docs/agents/tools/)與 [MCP](https://voltagent.dev/docs/agents/mcp/)**：提供具有生命週期鉤子和取消功能的 Zod 類型工具，並無需額外粘合代碼即可連接到 [Model Context Protocol](https://modelcontextprotocol.io/) 伺服器。
- **[LLM 兼容性](https://voltagent.dev/docs/getting-started/providers-models/)**：通過更改配置而不是重寫代理邏輯，在 OpenAI、Anthropic、Google 或其他提供商之間切換。
- **[記憶](https://voltagent.dev/docs/agents/memory/overview/)**：附加持久記憶適配器，使代理能夠跨運行記住重要上下文。
- **[檢索與 RAG](https://voltagent.dev/docs/rag/overview/)**：插入檢索器代理，從您的數據源提取事實並在模型回答之前奠定響應基礎（RAG）。
- **[評估](https://voltagent.dev/docs/evals/overview/)**：與您的工作流程一起運行代理評估套件，更快地提供防護欄。

### VoltOps LLM 可觀測性平台

VoltAgent 配備內建的 [VoltOps](#使用-voltops-的內建-llm-可觀測性) LLM 可觀測性，可即時監控和調試您的代理，提供詳細的執行追蹤、效能指標和視覺化儀表板。檢查代理做出的每個決策，追蹤工具使用情況，並使用內建的基於 OpenTelemetry 的可觀測性優化您的工作流程。

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
  instructions: "可以檢查天氣並協助各種任務的有用助手",
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

![VoltAgent VoltOps Platform Demo](https://github.com/user-attachments/assets/0adbec33-1373-4cf4-b67d-825f7baf1cb4)

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

![VoltOps Workflow Observability](https://github.com/user-attachments/assets/9b877c65-f095-407f-9237-d7879964c38a)

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

## 使用 VoltOps 的內建 LLM 可觀測性

VoltAgent 配備 VoltOps，這是一個內建的 LLM 可觀測性平台，可幫助您即時監控、調試和優化代理。

🎬 [試用即時演示](https://console.voltagent.dev/demo)

📖 [VoltOps 文檔](https://voltagent.dev/voltops-llm-observability-docs/)

🚀 [VoltOps 平台](https://voltagent.dev/voltops-llm-observability/)

### 可觀測性與追蹤

通過詳細的追蹤和效能指標深入了解代理執行流程。

<br/>

![VoltOps Observability Overview](https://cdn.voltagent.dev/console/observability.png)

### 儀表板

獲取所有代理、工作流程和系統效能指標的全面概覽。

<br/>

![VoltOps Dashboard](https://cdn.voltagent.dev/console/dashboard.png)

### 日誌

追蹤每個代理互動和工作流程步驟的詳細執行日誌。
<br/>

![VoltOps Logs](https://cdn.voltagent.dev/console/logs.png)

### 記憶管理

檢查和管理代理記憶、上下文和對話歷史。

<br/>

![VoltOps Memory Overview](https://cdn.voltagent.dev/console/memory.png)

### 追蹤

分析完整的執行追蹤以了解代理行為並優化效能。

<br/>

![VoltOps Traces](https://cdn.voltagent.dev/console/traces.png)

### 提示生成器

直接在控制台中設計、測試和改進提示。

<br/>

![VoltOps Prompt Builder](https://cdn.voltagent.dev/console/prompt.png)

## 範例

探索具有完整原始碼和視訊教程的 VoltAgent 實際實現。

有關更多範例和用例，請訪問我們的[範例存儲庫](https://github.com/VoltAgent/voltagent/tree/main/examples)。

### WhatsApp 訂單代理

構建一個 WhatsApp 聊天機器人，通過自然對話處理食品訂單，從數據庫管理菜單項，並使用完整的對話上下文處理訂單。

<br/>

<img width="1111" height="347" alt="whatsapp" src="https://github.com/user-attachments/assets/dc9c4986-3e68-42f8-a450-ecd79b4dbd99" />

<br/>
<br/>

- 📖 [教程](https://voltagent.dev/examples/agents/whatsapp-ai-agent)
- 💻 [原始碼](https://github.com/VoltAgent/voltagent/tree/main/examples/with-whatsapp)

### YouTube 轉部落格代理

使用監督者代理協調具有 MCP 工具、共享工作記憶和 VoltOps 可觀測性的子代理，將 YouTube 視訊轉換為 Markdown 部落格文章。

<br/>

<img width="1113" height="363" alt="youtube" src="https://github.com/user-attachments/assets/f9c944cf-8a9a-4ac5-a5f9-860ce08f058b" />

<br/>
<br/>

- 📖 [教程](https://voltagent.dev/examples/agents/youtube-blog-agent)
- 💻 [原始碼](https://github.com/VoltAgent/voltagent/tree/main/examples/with-youtube-to-blog)

### AI 廣告生成代理

實現一個 Instagram 廣告生成器，使用 BrowserBase Stagehand 分析著陸頁、提取品牌數據並通過 Google Gemini AI 生成視覺效果。

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator">
<img width="1115" height="363" alt="instagram" src="https://github.com/user-attachments/assets/973e79c7-34ec-4f8e-8a41-9273d44234c6" />
</a>

<br/>
<br/>

- 📖 [教程](https://voltagent.dev/examples/agents/ai-instagram-ad-agent)
- 💻 [原始碼](https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator)

### AI 食譜生成代理

構建一個智能食譜推薦系統，根據可用食材、飲食偏好和時間限制創建個性化烹飪建議。

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator">
<img width="1111" height="363" alt="cook" src="https://github.com/user-attachments/assets/dde6ce2f-c963-4075-9825-f216bc6e3467" />
</a>

<br/>
<br/>

- 📖 [教程](https://voltagent.dev/examples/agents/recipe-generator)
- 📹 [觀看視訊](https://youtu.be/KjV1c6AhlfY)
- 💻 [原始碼](https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator)

### AI 研究助手代理

創建一個多代理研究工作流程，其中不同的 AI 代理協作研究主題並生成具有類型安全數據流的全面報告。

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant">
<img width="2228" height="678" alt="research" src="https://github.com/user-attachments/assets/8f459748-132e-4ff3-9afe-0561fa5075c2" />
</a>

<br/>
<br/>

- 📖 [教程](https://voltagent.dev/examples/agents/research-assistant)
- 📹 [觀看視訊](https://youtu.be/j6KAUaoZMy4)
- 💻 [原始碼](https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant)

## 用例

為不同行業的實際業務需求構建 AI 代理：

- **[HR 代理](https://voltagent.dev/use-cases/hr-agent/)** - 自動化招聘、員工入職和 HR 支援任務。
- **[客戶支援代理](https://voltagent.dev/use-cases/customer-support-agent/)** - 構建處理客戶問題和疑問的支援代理。
- **[銷售團隊](https://voltagent.dev/use-cases/sales-teams/)** - 驗證潛在客戶、收集客戶數據並個性化銷售外展。
- **[財務代理](https://voltagent.dev/use-cases/finance-agent/)** - 管理發票、追蹤費用並生成財務報告。
- **[開發代理](https://voltagent.dev/use-cases/development-agent/)** - 審查程式碼、管理部署並幫助開發團隊。
- **[行銷代理](https://voltagent.dev/use-cases/marketing-agent/)** - 規劃活動、創建內容並分析行銷效能。
- **[法律代理](https://voltagent.dev/use-cases/legal-agent/)** - 審查合約、檢查合規性並處理法律任務。
- **[保險代理](https://voltagent.dev/use-cases/insurance-agent/)** - 處理索賠、評估風險並管理保單。
- **[工業代理](https://voltagent.dev/use-cases/industrial-agent/)** - 監控設備、預測維護需求並確保安全。
- **[教育代理](https://voltagent.dev/use-cases/education-agent/)** - 提供個性化輔導、追蹤學生進度並支援學習。
- **[政府代理](https://voltagent.dev/use-cases/government-agent/)** - 處理許可申請、處理福利並服務公民。
- **[文檔代理](https://voltagent.dev/use-cases/documentation-agent/)** - 創建 API 文檔、編寫變更日誌並從程式碼生成教程。

## 學習 VoltAgent

- 📖 **[從互動式教程開始](https://voltagent.dev/tutorial/introduction/)**以學習構建 AI 代理的基礎知識。
- **[文檔](https://voltagent.dev/docs/)**：深入了解指南、概念和教程。
- **[範例](https://github.com/voltagent/voltagent/tree/main/examples)**：探索實際實現。
- **[部落格](https://voltagent.dev/blog/)**：閱讀更多技術見解和最佳實踐。

## 貢獻

我們歡迎貢獻！請參閱貢獻指南（如有需要提供連結）。加入我們的 [Discord](https://s.voltagent.dev/discord) 伺服器進行問題討論。

## 貢獻者 ♥️ 感謝

非常感謝所有參與 VoltAgent 旅程的人，無論您是構建插件、提出問題、提交拉取請求，還是只是在 Discord 或 GitHub 討論中幫助他人。

VoltAgent 是一項社群努力，正是因為有像您這樣的人，它才不斷變得更好。

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent&max=100)

您的星星幫助我們接觸更多開發者！如果您發現 VoltAgent 有用，請考慮在 GitHub 上給我們一顆星以支援該專案並幫助其他人發現它。

## 許可證

在 MIT 許可證下授權，Copyright © 2025-present VoltAgent。
