<div align="center">
<a href="https://voltagent.dev/">
<img width="1500" height="276" alt="voltagent" src="https://github.com/user-attachments/assets/d9ad69bd-b905-42a3-81af-99a0581348c0" />
</a>

<h3 align="center">
AI Agent 工程平台
</h3>

<div align="center">
<a href="../README.md">English</a> | <a href="README-cn-traditional.md">繁體中文</a> | 简体中文 | <a href="README-jp.md">日本語</a> | <a href="README-kr.md">한국어</a>
</div>

<br/>

<div align="center">
    <a href="https://voltagent.dev">首页</a> |
    <a href="https://voltagent.dev/docs/">文档</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">示例</a>
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
⭐ 喜欢我们的项目吗？给我们一个星标 ⬆️
</h3>

VoltAgent 是一个端到端的 AI Agent 工程平台，由两个主要部分组成：

- **[开源 TypeScript 框架](#core-framework)** – Memory、RAG、Guardrails、Tools、MCP、Voice、Workflow 等。
- **[VoltOps 控制台](#voltops-console)** `Cloud` `Self-Hosted` – 可观测性、自动化、部署、评估、安全护栏、提示词等。

以完全的代码控制构建代理，并以生产就绪的可视化和操作来发布它们。

<h2 id="core-framework">核心 TypeScript 框架</h2>

使用开源框架，您可以构建具有记忆、工具和多步骤工作流的智能代理，同时连接到任何 AI 提供商。创建专业代理在主管协调下协同工作的精密多代理系统。

- **[核心运行时](https://voltagent.dev/docs/agents/overview/) (`@voltagent/core`)**：在一个地方定义具有类型化角色、工具、记忆和模型提供商的代理，使一切保持有序。
- **[工作流引擎](https://voltagent.dev/docs/workflows/overview/)**：声明式描述多步骤自动化，而不是拼接自定义控制流程。
- **[主管与子代理](https://voltagent.dev/docs/agents/sub-agents/)**：在主管运行时下运行专业代理的团队，该运行时路由任务并保持它们同步。
- **[工具注册表](https://voltagent.dev/docs/agents/tools/)与 [MCP](https://voltagent.dev/docs/agents/mcp/)**：提供具有生命周期钩子和取消功能的 Zod 类型工具，并无需额外粘合代码即可连接到 [Model Context Protocol](https://modelcontextprotocol.io/) 服务器。
- **[LLM 兼容性](https://voltagent.dev/docs/getting-started/providers-models/)**：通过更改配置而不是重写代理逻辑，在 OpenAI、Anthropic、Google 或其他提供商之间切换。
- **[记忆](https://voltagent.dev/docs/agents/memory/overview/)**：附加持久记忆适配器，使代理能够跨运行记住重要上下文。
- **[检索与 RAG](https://voltagent.dev/docs/rag/overview/)**：插入检索器代理，从您的数据源提取事实并在模型回答之前奠定响应基础（RAG）。
- **[VoltAgent 知识库](https://voltagent.dev/docs/rag/voltagent/)**：使用托管的 RAG 服务进行文档摄入、分块、嵌入和搜索。
- **[语音](https://voltagent.dev/docs/agents/voice/)**：使用 OpenAI、ElevenLabs 或自定义语音提供商添加文本转语音和语音转文本功能。
- **[安全护栏](https://voltagent.dev/docs/guardrails/overview/)**：在运行时拦截和验证代理输入或输出，以执行内容策略和安全规则。
- **[评估](https://voltagent.dev/docs/evals/overview/)**：与您的工作流一起运行代理评估套件，以衡量和改进代理行为。

#### MCP 服务器 (@voltagent/mcp-docs-server)

您可以使用 MCP 服务器 `@voltagent/mcp-docs-server` 来教导 LLM 如何使用 VoltAgent，用于 Claude、Cursor 或 Windsurf 等 AI 驱动的编码助手。这允许 AI 助手在您编码时直接访问 VoltAgent 文档、示例和变更日志。

📖 [如何设定 MCP 文档服务器](https://voltagent.dev/docs/getting-started/mcp-docs-server/)

## ⚡ 快速开始

使用 `create-voltagent-app` CLI 工具在几秒钟内创建新的 VoltAgent 项目：

```bash
npm create voltagent-app@latest
```

此命令将引导您完成设定。

您将在 `src/index.ts` 中看到入门代码，该代码现在注册了代理和全面的工作流示例，工作流示例位于 `src/workflows/index.ts` 中。

```typescript
import { VoltAgent, Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { openai } from "@ai-sdk/openai";
import { expenseApprovalWorkflow } from "./workflows";
import { weatherTool } from "./tools";

// 创建日志记录器实例
const logger = createPinoLogger({
  name: "my-agent-app",
  level: "info",
});

// 可选的持久记忆（删除以使用默认的记忆内）
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
});

// 项目的简单通用代理
const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant that can check weather and help with various tasks",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  memory,
});

// 使用代理和工作流初始化 VoltAgent
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

之后，导航到您的项目并运行：

```bash
npm run dev
```

运行 dev 命令时，tsx 将编译并运行您的代码。您应该在终端中看到 VoltAgent 服务器启动消息：

```
══════════════════════════════════════════════════
VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
✓ HTTP Server: http://localhost:3141

Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
```

您的代理现在正在运行！要与其互动：

1. 打开控制台：点击终端输出中的 [VoltOps LLM 可观测性平台](https://console.voltagent.dev) 链接（或复制并粘贴到浏览器）。
2. 找到您的代理：在 VoltOps LLM 可观测性平台页面上，您应该会看到列出的代理（例如"my-agent"）。
3. 打开代理详情：点击代理名称。
4. 开始聊天：在代理详情页面上，点击右下角的聊天图标以打开聊天窗口。
5. 发送消息：输入"你好"之类的消息并按 Enter。

[![VoltAgent Demo](https://github.com/user-attachments/assets/26340c6a-be34-48a5-9006-e822bf6098a7)](https://github.com/user-attachments/assets/26340c6a-be34-48a5-9006-e822bf6098a7)

### 运行您的第一个工作流

您的新项目还包括一个强大的工作流引擎。

费用批准工作流演示了具有暂停/恢复功能的人机协作自动化：

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
  // 步骤 1：验证费用并检查是否需要批准
  .andThen({
    id: "check-approval-needed",
    resumeSchema: z.object({
      approved: z.boolean(),
      managerId: z.string(),
      comments: z.string().optional(),
      adjustedAmount: z.number().optional(),
    }),
    execute: async ({ data, suspend, resumeData }) => {
      // 如果我们正在恢复经理的决定
      if (resumeData) {
        return {
          ...data,
          approved: resumeData.approved,
          approvedBy: resumeData.managerId,
          finalAmount: resumeData.adjustedAmount || data.amount,
        };
      }

      // 检查是否需要经理批准（超过 $500 的费用）
      if (data.amount > 500) {
        await suspend("Manager approval required", {
          employeeId: data.employeeId,
          requestedAmount: data.amount,
        });
      }

      // 自动批准小额费用
      return {
        ...data,
        approved: true,
        approvedBy: "system",
        finalAmount: data.amount,
      };
    },
  })
  // 步骤 2：处理最终决定
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

您可以直接从 VoltOps 控制台测试预建的 `expenseApprovalWorkflow`：

[![expense-approval](https://github.com/user-attachments/assets/3d3ea67b-4ab5-4dc0-932d-cedd92894b18)](https://github.com/user-attachments/assets/3d3ea67b-4ab5-4dc0-932d-cedd92894b18)

1.  **前往工作流页面**：启动服务器后，直接前往[工作流页面](https://console.voltagent.dev/workflows)。
2.  **选择您的项目**：使用项目选择器选择您的项目（例如"my-agent-app"）。
3.  **查找并运行**：您将看到列出的 **"Expense Approval Workflow"**。点击它，然后点击 **"Run"** 按钮。
4.  **提供输入**：工作流期望包含费用详情的 JSON 对象。尝试小额费用以进行自动批准：
    ```json
    {
      "employeeId": "EMP-123",
      "amount": 250,
      "category": "office-supplies",
      "description": "New laptop mouse and keyboard"
    }
    ```
5.  **查看结果**：执行后，您可以检查每个步骤的详细日志，并直接在控制台中查看最终输出。

## 示例

有关更多示例，请访问我们的[示例仓库](https://github.com/VoltAgent/voltagent/tree/main/examples)。

- **[Airtable 代理](https://voltagent.dev/examples/guides/airtable-agent)** - 响应新记录并通过 VoltOps 操作将更新写回 Airtable。
- **[Slack 代理](https://voltagent.dev/examples/guides/slack-agent)** - 响应频道消息并通过 VoltOps Slack 操作进行回复。
- **[ChatGPT 应用与 VoltAgent](https://voltagent.dev/examples/agents/chatgpt-app)** - 通过 MCP 部署 VoltAgent 并连接到 ChatGPT 应用。
- **[WhatsApp 订单代理](https://voltagent.dev/examples/agents/whatsapp-ai-agent)** - 构建一个 WhatsApp 聊天机器人，通过自然对话处理食品订单。([源代码](https://github.com/VoltAgent/voltagent/tree/main/examples/with-whatsapp))
- **[YouTube 转博客代理](https://voltagent.dev/examples/agents/youtube-blog-agent)** - 使用主管代理与 MCP 工具将 YouTube 视频转换为 Markdown 博客文章。([源代码](https://github.com/VoltAgent/voltagent/tree/main/examples/with-youtube-to-blog))
- **[AI 广告生成代理](https://voltagent.dev/examples/agents/ai-instagram-ad-agent)** - 使用 BrowserBase Stagehand 和 Google Gemini AI 生成 Instagram 广告。([源代码](https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator))
- **[AI 食谱生成代理](https://voltagent.dev/examples/agents/recipe-generator)** - 根据食材和偏好创建个性化烹饪建议。([源代码](https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator) | [视频](https://youtu.be/KjV1c6AhlfY))
- **[AI 研究助手代理](https://voltagent.dev/examples/agents/research-assistant)** - 用于生成全面报告的多代理研究工作流。([源代码](https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant) | [视频](https://youtu.be/j6KAUaoZMy4))

<h2 id="voltops-console">VoltOps 控制台：LLM 可观测性 - 自动化 - 部署</h2>

VoltOps 控制台是 VoltAgent 的平台端，提供可观测性、自动化和部署功能，让您可以通过实时执行跟踪、性能指标和可视化仪表板在生产环境中监控和调试代理。

🎬 [试用实时演示](https://console.voltagent.dev/demo)

📖 [VoltOps 文档](https://voltagent.dev/voltops-llm-observability-docs/)

🚀 [VoltOps 平台](https://voltagent.dev/voltops-llm-observability/)

### 可观测性与跟踪

通过详细的跟踪和性能指标深入了解代理执行流程。

<img alt="1" src="https://github.com/user-attachments/assets/21c6d05d-f333-4c61-9218-8862d16110fd" />

### 仪表板

获取所有代理、工作流和系统性能指标的全面概览。

<img alt="dashboard" src="https://github.com/user-attachments/assets/c88a5543-219e-4cf0-8f41-14a68ca297fb" />

### 日志

跟踪每个代理交互和工作流步骤的详细执行日志。

![VoltOps Logs](https://cdn.voltagent.dev/console/logs.png)

### 记忆管理

检查和管理代理记忆、上下文和对话历史。

![VoltOps Memory Overview](https://cdn.voltagent.dev/console/memory.png)

### 跟踪

分析完整的执行跟踪以了解代理行为并优化性能。

![VoltOps Traces](https://cdn.voltagent.dev/console/traces.png)

### 提示生成器

直接在控制台中设计、测试和改进提示。

<img  alt="prompts" src="https://github.com/user-attachments/assets/fb6d71eb-8f81-4443-a494-08c33ec9bcc4" />

### 部署

通过一键 GitHub 集成和托管基础架构将您的代理部署到生产环境。

<img alt="deployment" src="https://github.com/user-attachments/assets/e329ab4b-7464-435a-96cc-90214e8a3cfa" />

📖 [VoltOps 部署文档](https://voltagent.dev/docs/deployment/voltops/)

### 触发器与操作

使用 webhooks、计划和自定义触发器自动化代理工作流，以响应外部事件。

<img width="1277"  alt="triggers" src="https://github.com/user-attachments/assets/67e36934-2eb5-4cf1-94f8-3057d805ef65" />

### 监控

监控整个系统的代理健康状况、性能指标和资源使用情况。

<img  alt="monitoring" src="https://github.com/user-attachments/assets/1fd1151f-5ee4-4c7c-8ec7-29874e37c48f" />

### 安全护栏

设置安全边界和内容过滤器，确保代理在定义的参数范围内运行。

<img  alt="guardrails" src="https://github.com/user-attachments/assets/52bd51f0-944e-4202-9f54-7bb2e0e2d1f6" />

### 评估

运行评估套件以测试代理行为、准确性和性能基准。

<img  alt="evals" src="https://github.com/user-attachments/assets/510cc180-2661-4973-a48f-074d4703d90b" />

### RAG（知识库）

将您的代理连接到知识源，具有内置的检索增强生成功能。

<img  alt="rag" src="https://github.com/user-attachments/assets/a6c2f668-7ad1-4fb6-b67f-654335285f1e" />

## 学习 VoltAgent

- **[从互动式教程开始](https://voltagent.dev/tutorial/introduction/)** 以学习构建 AI 代理的基础知识。
- **[文档](https://voltagent.dev/docs/)**：深入了解指南、概念和教程。
- **[示例](https://github.com/voltagent/voltagent/tree/main/examples)**：探索实际实现。
- **[博客](https://voltagent.dev/blog/)**：阅读更多技术见解和最佳实践。

## 贡献

我们欢迎贡献！请参阅贡献指南（如有需要提供链接）。加入我们的 [Discord](https://s.voltagent.dev/discord) 服务器进行问题讨论。

## 贡献者 ♥️ 感谢

非常感谢所有参与 VoltAgent 旅程的人，无论您是构建插件、提出问题、提交拉取请求，还是只是在 Discord 或 GitHub 讨论中帮助他人。

VoltAgent 是一项社区努力，正是因为有像您这样的人，它才不断变得更好。

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent&max=500&columns=20&anon=1)

## 许可证

在 MIT 许可证下授权，Copyright © 2026-present VoltAgent。
