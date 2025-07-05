<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
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
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">示例</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">博客</a>
</div>
</div>

<br/>

<div align="center">
    <strong>VoltAgent 是一个开源的 TypeScript 框架，用于构建和编排 AI 智能体。</strong><br>
摆脱无代码构建器的局限性和从零开始的复杂性。
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

## 什么是 VoltAgent？

> **AI 智能体框架**提供了构建由自主智能体驱动的应用程序所需的基础结构和工具。这些智能体通常由大型语言模型（LLM）驱动，能够感知环境、做出决策并采取行动来实现特定目标。从零开始构建此类智能体涉及管理与 LLM 的复杂交互、处理状态、连接外部工具和数据，以及编排工作流程。

**VoltAgent** 是一个开源的 TypeScript 框架，作为这个重要的工具包。它通过提供模块化的构建块、标准化模式和抽象来简化 AI 智能体应用程序的开发。无论您是在创建聊天机器人、虚拟助手、自动化工作流程还是复杂的多智能体系统，VoltAgent 都能处理底层复杂性，让您专注于定义智能体的能力和逻辑。

VoltAgent 提供现成的模块化构建块，而不是从零开始构建所有内容：

- **核心引擎（`@voltagent/core`）**：VoltAgent 的核心，为您的 AI 智能体提供基本功能，定义具有特定角色、工具和记忆的个别智能体。
- **多智能体系统**：通过使用监督者协调多个专业智能体来构建复杂的应用程序。
- **可扩展包**：使用 `@voltagent/voice` 等包增强语音交互功能。
- **工具和集成**：为智能体配备工具以连接外部 API、数据库和服务，使其能够执行实际任务。**支持[模型上下文协议（MCP）](https://modelcontextprotocol.io/)用于标准化工具交互。**
- **数据检索和 RAG**：实施专门的检索器智能体以实现高效的信息获取和**检索增强生成（RAG）**。
- **记忆**：使智能体能够记住过去的交互，以实现更自然和上下文感知的对话。
- **LLM 兼容性**：与来自 OpenAI、Google、Anthropic 等流行 AI 模型配合使用，允许轻松切换。
- **开发者生态系统**：包括 `create-voltagent-app`、`@voltagent/cli` 和可视化 [VoltOps LLM 可观察性平台](https://console.voltagent.dev) 等助手，用于快速设置、监控和调试。

总之，VoltAgent 帮助开发者更快、更可靠地构建复杂的 AI 应用程序，避免重复设置和简单工具的限制。

## 为什么选择 VoltAgent？

构建 AI 应用程序通常涉及权衡：

1.  **DIY 方法：**使用基本的 AI 提供商工具提供控制权，但会导致复杂、难以管理的代码和重复工作。
2.  **无代码构建器：**最初更简单，但通常限制性强，限制自定义、提供商选择和复杂性。

VoltAgent 提供了中间地带，在不牺牲灵活性的情况下提供结构和组件：

- **更快构建：**与从零开始相比，使用预构建组件加速开发。
- **可维护代码：**鼓励组织以便于更新和调试。
- **可扩展性：**从简单开始，轻松扩展到处理复杂工作流程的复杂多智能体系统。
- **灵活性：**完全控制智能体行为、LLM 选择、工具集成和 UI 连接。
- **避免锁定：**根据需要自由切换 AI 提供商和模型。
- **成本效率：**旨在优化 AI 服务使用并减少冗余调用的功能。
- **可视化监控：**使用 [VoltOps LLM 可观察性平台](https://console.voltagent.dev) 跟踪智能体性能、检查状态并进行可视化调试。

VoltAgent 使开发者能够高效地构建他们设想的 AI 应用程序，从简单的助手到复杂的系统。

## ⚡ 快速开始

使用 `create-voltagent-app` CLI 工具在几秒钟内创建新的 VoltAgent 项目：

```bash
npm create voltagent-app@latest
```

此命令引导您完成设置。

您将在 `src/index.ts` 中看到起始代码，帮助您开始使用 VoltAgent 框架。

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai"; // 示例提供商
import { openai } from "@ai-sdk/openai"; // 示例模型

// 定义一个简单的智能体
const agent = new Agent({
  name: "my-agent",
  instructions: "一个有用的助手，无需使用工具即可回答问题",
  // 注意：您可以将 VercelAIProvider 和 openai 替换为其他支持的提供商/模型
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// 使用您的智能体初始化 VoltAgent
new VoltAgent({
  agents: {
    agent,
  },
});
```

之后，导航到您的项目并运行：

```bash
npm run dev
```

当您运行 dev 命令时，tsx 将编译并运行您的代码。您应该在终端中看到 VoltAgent 服务器启动消息：

```
══════════════════════════════════════════════════
VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
✓ HTTP Server: http://localhost:3141

Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
```

您的智能体现在正在运行！要与其交互：

1. 打开控制台：点击终端输出中的 [VoltOps LLM 可观察性平台](https://console.voltagent.dev) 链接（或将其复制粘贴到浏览器中）。
2. 找到您的智能体：在 VoltOps LLM 可观察性平台页面上，您应该看到您的智能体列出（例如，"my-agent"）。
3. 打开智能体详情：点击您的智能体名称。
4. 开始聊天：在智能体详情页面上，点击右下角的聊天图标打开聊天窗口。
5. 发送消息：输入消息如"你好"并按 Enter。

[![VoltAgent VoltOps Platform Demo](https://github.com/user-attachments/assets/0adbec33-1373-4cf4-b67d-825f7baf1cb4)](https://console.voltagent.dev/)

## 主要功能

- **智能体核心：**使用描述、LLM 提供商、工具和记忆管理定义智能体。
- **多智能体系统：**使用监督者智能体协调多个专业子智能体构建复杂的工作流程。
- **工具使用和生命周期：**为智能体配备自定义或预构建的工具（函数），具有类型安全性（Zod）、生命周期钩子和取消支持，以与外部系统交互。
- **灵活的 LLM 支持：**与各种 LLM 提供商（OpenAI、Anthropic、Google 等）无缝集成，并轻松切换模型。
- **记忆管理：**使智能体能够使用不同的可配置记忆提供商在交互之间保留上下文。
- **可观察性和调试：**通过 [VoltOps LLM 可观察性平台](https://console.voltagent.dev) 可视化监控智能体状态、交互、日志和性能。
- **自定义 API 端点：**使用您自己的自定义端点扩展 VoltAgent API 服务器，在核心框架之上构建专门功能。
- **语音交互：**使用 `@voltagent/voice` 包构建能够语音识别和合成的语音启用智能体。
- **数据检索和 RAG：**集成专门的检索器智能体，从各种来源实现高效的信息获取和**检索增强生成（RAG）**。
- **模型上下文协议（MCP）支持：**连接到遵循 [MCP 标准](https://modelcontextprotocol.io/) 的外部工具服务器（HTTP/stdio）以获得扩展功能。
- **提示工程工具：**利用 `createPrompt` 等工具为您的智能体制作和管理有效的提示。
- **框架兼容性：**设计用于轻松集成到现有 Node.js 应用程序和流行框架中。

## 使用案例

VoltAgent 多功能，可为各种 AI 驱动的应用程序提供动力：

- **复杂工作流程自动化：**使用协调智能体编排涉及各种工具、API 和决策点的多步骤流程。
- **智能数据管道：**构建从不同来源获取、处理、分析和转换数据的智能体。
- **AI 驱动的内部工具和仪表板：**创建利用 AI 进行分析、报告或任务自动化的交互式内部应用程序，通常使用钩子与 UI 集成。
- **自动化客户支持智能体：**开发能够理解上下文（记忆）、使用工具（例如检查订单状态）并升级复杂问题的复杂聊天机器人。
- **存储库分析和代码库自动化：**分析代码存储库、自动化重构任务、生成文档或管理 CI/CD 流程。
- **检索增强生成（RAG）系统：**构建在生成知情响应之前从知识库检索相关信息（使用检索器智能体）的智能体。
- **语音控制界面和应用程序：**利用 `@voltagent/voice` 包创建响应和生成口语的应用程序。
- **个性化用户体验：**开发根据存储在记忆中的用户历史和偏好调整响应和操作的智能体。
- **实时监控和警报：**设计持续监控数据流或系统并根据定义条件触发操作或通知的智能体。
- **以及几乎任何其他事情...**：如果您能想象 AI 智能体做这件事，VoltAgent 可能可以帮助您构建它！⚡

## 学习 VoltAgent

- **[文档](https://voltagent.dev/docs/)**：深入了解指南、概念和教程。
- **[示例](https://github.com/voltagent/voltagent/tree/main/examples)**：探索实际实施。
- **[博客](https://voltagent.dev/blog/)**：阅读更多技术见解和最佳实践。

## 贡献

我们欢迎贡献！请参考贡献指南（如果可用，需要链接）。加入我们的 [Discord](https://s.voltagent.dev/discord) 服务器进行问题和讨论。

## 贡献者 ♥️ 感谢

非常感谢每个参与 VoltAgent 之旅的人，无论您是构建了插件、开启了问题、提交了拉取请求，还是只是在 Discord 或 GitHub 讨论中帮助了某人。

VoltAgent 是一个社区努力，因为有您这样的人，它一直在变得更好。

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent)

您的星星帮助我们接触更多开发者！如果您发现 VoltAgent 有用，请考虑在 GitHub 上给我们一个星星以支持项目并帮助其他人发现它。

## 许可证

根据 MIT 许可证授权，版权所有 © 2025 至今 VoltAgent。
