<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/9259e833-0f5c-4eb6-8cc7-4e6930cc27e1" />
</a>

<br/>
<br/>
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

<div align="center">
⭐ 喜欢我们的项目吗？给我们一个星标 ⬆️
</div>

<br/>

**VoltAgent** 是一个开源的 TypeScript 框架，用于构建和编排 AI 代理。
您可以构建具有记忆、工作流、工具和内置 LLM 可观测性的生产级代理。

## 为什么选择 VoltAgent？

- **从第一天就准备就绪进行生产部署**：使用内置的记忆、工作流和可观测性部署代理，无需从零开始构建基础架构。
- **自信编码**：完整的 TypeScript 支持，具有类型安全的工具、自动推断和整个代理系统的编译时安全性。
- **像专业人士一样调试**：内置的 VoltOps 可观测性让您可以追踪每个决策、监控性能，并在不借助外部工具的情况下实时优化工作流。
- **简单构建复杂系统**：通过主管协调、声明式工作流和模块化架构编排多代理团队，从原型扩展到生产环境。

## 代理开发平台

VoltAgent 通过两个互补的工具提供完整的开发和监控 AI 代理平台。

### 核心框架

使用核心框架，您可以构建具有记忆、工具和多步骤工作流的智能代理，同时连接到任何 AI 提供商。创建专业代理在主管协调下协同工作的精密多代理系统。

- **[核心运行时](https://voltagent.dev/docs/agents/overview/) (`@voltagent/core`)**：在一个地方定义具有类型化角色、工具、记忆和模型提供商的代理，使一切保持有序。
- **[工作流引擎](https://voltagent.dev/docs/workflows/overview/)**：声明式描述多步骤自动化，而不是拼接自定义控制流程。
- **[主管与子代理](https://voltagent.dev/docs/agents/sub-agents/)**：在主管运行时下运行专业代理的团队，该运行时路由任务并保持它们同步。
- **[工具注册表](https://voltagent.dev/docs/agents/tools/)与 [MCP](https://voltagent.dev/docs/agents/mcp/)**：提供具有生命周期钩子和取消功能的 Zod 类型工具，并无需额外粘合代码即可连接到 [Model Context Protocol](https://modelcontextprotocol.io/) 服务器。
- **[LLM 兼容性](https://voltagent.dev/docs/getting-started/providers-models/)**：通过更改配置而不是重写代理逻辑，在 OpenAI、Anthropic、Google 或其他提供商之间切换。
- **[记忆](https://voltagent.dev/docs/agents/memory/overview/)**：附加持久记忆适配器，使代理能够跨运行记住重要上下文。
- **[检索与 RAG](https://voltagent.dev/docs/rag/overview/)**：插入检索器代理，从您的数据源提取事实并在模型回答之前奠定响应基础（RAG）。
- **[VoltAgent 知识库](https://voltagent.dev/docs/rag/voltagent/)**：使用托管的 RAG 服务进行文档摄入、分块、嵌入和搜索。
- **[评估](https://voltagent.dev/docs/evals/overview/)**：与您的工作流一起运行代理评估套件，更快地提供防护栏。

### VoltOps LLM 可观测性平台

VoltAgent 配备内置的 [VoltOps](#使用-voltops-的内置-llm-可观测性) LLM 可观测性，可即时监控和调试您的代理，提供详细的执行跟踪、性能指标和视觉化仪表板。检查代理做出的每个决策，跟踪工具使用情况，并使用内置的基于 OpenTelemetry 的可观测性优化您的工作流。

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
  instructions: "可以检查天气并协助各种任务的有用助手",
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

![VoltAgent VoltOps Platform Demo](https://github.com/user-attachments/assets/0adbec33-1373-4cf4-b67d-825f7baf1cb4)

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

![VoltOps Workflow Observability](https://github.com/user-attachments/assets/9b877c65-f095-407f-9237-d7879964c38a)

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

## 使用 VoltOps 的内置 LLM 可观测性

VoltAgent 配备 VoltOps，这是一个内置的 LLM 可观测性平台，可帮助您即时监控、调试和优化代理。

🎬 [试用实时演示](https://console.voltagent.dev/demo)

📖 [VoltOps 文档](https://voltagent.dev/voltops-llm-observability-docs/)

🚀 [VoltOps 平台](https://voltagent.dev/voltops-llm-observability/)

### 可观测性与跟踪

通过详细的跟踪和性能指标深入了解代理执行流程。

<br/>

![VoltOps Observability Overview](https://cdn.voltagent.dev/console/observability.png)

### 仪表板

获取所有代理、工作流和系统性能指标的全面概览。

<br/>

![VoltOps Dashboard](https://cdn.voltagent.dev/console/dashboard.png)

### 日志

跟踪每个代理交互和工作流步骤的详细执行日志。
<br/>

![VoltOps Logs](https://cdn.voltagent.dev/console/logs.png)

### 记忆管理

检查和管理代理记忆、上下文和对话历史。

<br/>

![VoltOps Memory Overview](https://cdn.voltagent.dev/console/memory.png)

### 跟踪

分析完整的执行跟踪以了解代理行为并优化性能。

<br/>

![VoltOps Traces](https://cdn.voltagent.dev/console/traces.png)

### 提示生成器

直接在控制台中设计、测试和改进提示。

<br/>

![VoltOps Prompt Builder](https://cdn.voltagent.dev/console/prompt.png)

### 部署

通过一键 GitHub 集成和托管基础架构将您的代理部署到生产环境。

<br/>

![VoltOps Deploy](https://cdn.voltagent.dev/website/feature-showcase/deployment.png)

📖 [VoltOps 部署文档](https://voltagent.dev/docs/deployment/voltops/)

## 示例

探索具有完整源代码和视频教程的 VoltAgent 实际实现。

有关更多示例和用例，请访问我们的[示例仓库](https://github.com/VoltAgent/voltagent/tree/main/examples)。

### WhatsApp 订单代理

构建一个 WhatsApp 聊天机器人，通过自然对话处理食品订单，从数据库管理菜单项，并使用完整的对话上下文处理订单。

<br/>

<img width="1111" height="347" alt="whatsapp" src="https://github.com/user-attachments/assets/dc9c4986-3e68-42f8-a450-ecd79b4dbd99" />

<br/>
<br/>


- 📖 [教程](https://voltagent.dev/examples/agents/whatsapp-ai-agent)
- 💻 [源代码](https://github.com/VoltAgent/voltagent/tree/main/examples/with-whatsapp)

### YouTube 转博客代理

使用主管代理协调具有 MCP 工具、共享工作记忆和 VoltOps 可观测性的子代理，将 YouTube 视频转换为 Markdown 博客文章。

<br/>

<img width="1113" height="363" alt="youtube" src="https://github.com/user-attachments/assets/f9c944cf-8a9a-4ac5-a5f9-860ce08f058b" />

<br/>
<br/>


- 📖 [教程](https://voltagent.dev/examples/agents/youtube-blog-agent)
- 💻 [源代码](https://github.com/VoltAgent/voltagent/tree/main/examples/with-youtube-to-blog)

### AI 广告生成代理

实现一个 Instagram 广告生成器，使用 BrowserBase Stagehand 分析着陆页、提取品牌数据并通过 Google Gemini AI 生成视觉效果。

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator">
<img width="1115" height="363" alt="instagram" src="https://github.com/user-attachments/assets/973e79c7-34ec-4f8e-8a41-9273d44234c6" />
</a>

<br/>
<br/>


- 📖 [教程](https://voltagent.dev/examples/agents/ai-instagram-ad-agent)
- 💻 [源代码](https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator)

### AI 食谱生成代理

构建一个智能食谱推荐系统，根据可用食材、饮食偏好和时间限制创建个性化烹饪建议。

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator">
<img width="1111" height="363" alt="cook" src="https://github.com/user-attachments/assets/dde6ce2f-c963-4075-9825-f216bc6e3467" />
</a>

<br/>
<br/>


- 📖 [教程](https://voltagent.dev/examples/agents/recipe-generator)
- 📹 [观看视频](https://youtu.be/KjV1c6AhlfY)
- 💻 [源代码](https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator)

### AI 研究助手代理

创建一个多代理研究工作流，其中不同的 AI 代理协作研究主题并生成具有类型安全数据流的全面报告。

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant">
<img width="2228" height="678" alt="research" src="https://github.com/user-attachments/assets/8f459748-132e-4ff3-9afe-0561fa5075c2" />
</a>

<br/>
<br/>


- 📖 [教程](https://voltagent.dev/examples/agents/research-assistant)
- 📹 [观看视频](https://youtu.be/j6KAUaoZMy4)
- 💻 [源代码](https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant)

## 用例

为不同行业的实际业务需求构建 AI 代理：

- **[HR 代理](https://voltagent.dev/use-cases/hr-agent/)** - 自动化招聘、员工入职和 HR 支持任务。
- **[客户支持代理](https://voltagent.dev/use-cases/customer-support-agent/)** - 构建处理客户问题和疑问的支持代理。
- **[销售团队](https://voltagent.dev/use-cases/sales-teams/)** - 验证潜在客户、收集客户数据并个性化销售外展。
- **[财务代理](https://voltagent.dev/use-cases/finance-agent/)** - 管理发票、跟踪费用并生成财务报告。
- **[开发代理](https://voltagent.dev/use-cases/development-agent/)** - 审查代码、管理部署并帮助开发团队。
- **[营销代理](https://voltagent.dev/use-cases/marketing-agent/)** - 规划活动、创建内容并分析营销性能。
- **[法律代理](https://voltagent.dev/use-cases/legal-agent/)** - 审查合同、检查合规性并处理法律任务。
- **[保险代理](https://voltagent.dev/use-cases/insurance-agent/)** - 处理索赔、评估风险并管理保单。
- **[工业代理](https://voltagent.dev/use-cases/industrial-agent/)** - 监控设备、预测维护需求并确保安全。
- **[教育代理](https://voltagent.dev/use-cases/education-agent/)** - 提供个性化辅导、跟踪学生进度并支持学习。
- **[政府代理](https://voltagent.dev/use-cases/government-agent/)** - 处理许可申请、处理福利并服务公民。
- **[文档代理](https://voltagent.dev/use-cases/documentation-agent/)** - 创建 API 文档、编写变更日志并从代码生成教程。

## 学习 VoltAgent

- 📖 **[从互动式教程开始](https://voltagent.dev/tutorial/introduction/)**以学习构建 AI 代理的基础知识。
- **[文档](https://voltagent.dev/docs/)**：深入了解指南、概念和教程。
- **[示例](https://github.com/voltagent/voltagent/tree/main/examples)**：探索实际实现。
- **[博客](https://voltagent.dev/blog/)**：阅读更多技术见解和最佳实践。

## 贡献

我们欢迎贡献！请参阅贡献指南（如有需要提供链接）。加入我们的 [Discord](https://s.voltagent.dev/discord) 服务器进行问题讨论。

## 贡献者 ♥️ 感谢

非常感谢所有参与 VoltAgent 旅程的人，无论您是构建插件、提出问题、提交拉取请求，还是只是在 Discord 或 GitHub 讨论中帮助他人。

VoltAgent 是一项社区努力，正是因为有像您这样的人，它才不断变得更好。

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent&max=100)

您的星星帮助我们接触更多开发者！如果您发现 VoltAgent 有用，请考虑在 GitHub 上给我们一颗星以支持该项目并帮助其他人发现它。

## 许可证

在 MIT 许可证下授权，Copyright © 2025-present VoltAgent。
