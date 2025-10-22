<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="voltagent-banner" src="https://github.com/user-attachments/assets/9259e833-0f5c-4eb6-8cc7-4e6930cc27e1" />
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

[![GitHub stars](https://img.shields.io/github/stars/voltagent/voltagent?style=social)](https://github.com/voltagent/voltagent)
[![GitHub issues](https://img.shields.io/github/issues/voltagent/voltagent)](https://github.com/voltagent/voltagent/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/voltagent/voltagent)](https://github.com/voltagent/voltagent/pulls)
[![License](https://img.shields.io/github/license/voltagent/voltagent)](https://github.com/voltagent/voltagent/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>

<br/>

## 为什么选择 VoltAgent？

- **真正的代码优先**：不是低代码或无代码 - 为喜欢代码的开发人员提供完全的灵活性和控制
- **内置可观察性**：VoltOps 与平台深度集成 - 不是事后添加的附加功能
- **原生多代理协调**：唯一一个将工作流和多代理编排作为核心功能的框架
- **生产就绪**：受企业客户在现实世界高规模场景中的信任和测试

## 代理开发平台

VoltAgent 不仅仅是一个框架 - 它是一个完整的平台，包括：

### 核心框架

- **灵活的代理系统**：使用工具、记忆和自定义指令构建单个代理或复杂的多代理系统
- **工作流引擎**：使用 `createWorkflowChain` 编排复杂、多步骤的 AI 工作流，具有状态管理和错误处理
- **工具生态系统**：广泛的预构建集成和对自定义工具的支持
- **记忆管理**：多种记忆提供程序，支持短期和长期上下文保留
- **LLM 灵活性**：与任何 AI 提供程序配合使用 - OpenAI、Anthropic、Google 等
- **MCP 支持**：模型上下文协议集成，用于标准化工具使用

### VoltOps LLM 可观察性平台

完全集成的 LLM 可观察性平台，用于监控、调试和优化您的代理：

- **实时跟踪**：可视化代理执行、工具调用和 LLM 交互
- **性能监控**：跟踪延迟、成本和令牌使用情况
- **调试工具**：检查状态、查看日志并重放交互
- **生产监控**：监控实时代理性能和错误

## ⚡ 快速开始

使用 `create-voltagent-app` 在几秒钟内创建一个新的 VoltAgent 项目：

```bash
npm create voltagent-app@latest
```

在现有项目中安装 VoltAgent：

```bash
npm install @voltagent/core
```

创建您的第一个代理工作流：

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

// 费用批准工作流
export const expenseApprovalWorkflow = createWorkflowChain({
  id: "expense-approval",
  name: "费用批准工作流",
  purpose: "处理费用报告，对高金额进行经理批准",

  // 定义工作流数据结构
  schema: z.object({
    employeeName: z.string(),
    amount: z.number(),
    category: z.string(),
    description: z.string(),
    approved: z.boolean().optional(),
    reviewerNotes: z.string().optional(),
  }),

  // 步骤 1：验证费用并检查是否需要批准
  async run({ data, logger }) {
    logger.info(`处理 ${data.employeeName} 的费用报告: $${data.amount}`);

    if (data.amount < 100) {
      logger.info("金额低于 $100 - 自动批准");
      return {
        ...data,
        approved: true,
        reviewerNotes: "在限额内自动批准",
      };
    }

    logger.info("需要经理批准");
    // 暂停工作流以进行人工审核
    return { suspend: { reason: "等待经理批准" } };
  },
})
  // 步骤 2：经理批准后继续
  .andThen({
    id: "finalize-approval",
    name: "完成批准",
    async run({ data, logger }) {
      if (data.approved) {
        logger.info(`费用已批准: $${data.amount}`);
        // 在这里添加通知逻辑
      } else {
        logger.info("费用被拒绝");
      }
      return data;
    },
  });

// 运行工作流
const result = await expenseApprovalWorkflow.run({
  employeeName: "Alice",
  amount: 250,
  category: "软件",
  description: "团队许可证",
});
```

## 使用 VoltOps 的内置 LLM 可观察性

VoltAgent 配备了 **VoltOps** - 一个强大的 LLM 可观察性平台，为您的 AI 代理提供完整的可见性。

### 实时跟踪和可视化

在 VoltOps 控制台中实时查看您的代理运行：

<div align="center">
<a href="https://console.voltagent.dev">
<img width="800" alt="voltagent-trace-1" src="https://github.com/user-attachments/assets/f9ba0406-7e4b-4866-9754-e9d9f1d9eb84" />
</a>
</div>

### 深入了解每个跟踪

单击任何跟踪以查看完整的执行详细信息：

<div align="center">
<a href="https://console.voltagent.dev">
<img width="800" alt="voltagent-trace-2" src="https://github.com/user-attachments/assets/d7c6f93b-80ca-4c4f-9c86-d93ca9754806" />
</a>
</div>

### 检查 LLM 调用和响应

查看发送到 LLM 的确切提示和收到的响应：

<div align="center">
<a href="https://console.voltagent.dev">
<img width="800" alt="voltagent-llm-call" src="https://github.com/user-attachments/assets/7e5a8e3c-9e7c-4d3c-9e5e-e5e5e5e5e5e5" />
</a>
</div>

### 监控工具执行

跟踪您的代理调用的工具及其结果：

<div align="center">
<a href="https://console.voltagent.dev">
<img width="800" alt="voltagent-tool-calls" src="https://github.com/user-attachments/assets/8e5a8e3c-9e7c-4d3c-9e5e-e5e5e5e5e5e6" />
</a>
</div>

### 性能指标

跟踪延迟、令牌使用和成本：

<div align="center">
<a href="https://console.voltagent.dev">
<img width="800" alt="voltagent-metrics" src="https://github.com/user-attachments/assets/9e5a8e3c-9e7c-4d3c-9e5e-e5e5e5e5e5e7" />
</a>
</div>

### 生产监控

在生产中监控您的代理性能：

<div align="center">
<a href="https://console.voltagent.dev">
<img width="800" alt="voltagent-production" src="https://github.com/user-attachments/assets/0e5a8e3c-9e7c-4d3c-9e5e-e5e5e5e5e5e8" />
</a>
</div>

> **立即开始**：创建新的 VoltAgent 项目时，VoltOps 会自动配置。只需运行 `npm run dev` 并访问 [console.voltagent.dev](https://console.voltagent.dev) 即可查看您的代理运行情况！

## 示例

### WhatsApp 订单代理

一个全功能的 AI 驱动的 WhatsApp 机器人，用于餐厅订单，具有记忆、工具使用和 Supabase 集成。

<div align="center">
<a href="https://github.com/voltagent/voltagent/tree/main/examples/with-whatsapp">
<img width="800" alt="whatsapp-agent" src="https://github.com/user-attachments/assets/5aa65d69-33c3-4c32-b5b2-2e9b5c8e8e8e" />
</a>
</div>

[查看示例 →](https://github.com/voltagent/voltagent/tree/main/examples/with-whatsapp)

### YouTube 转博客代理

将 YouTube 视频转换为 SEO 优化的博客文章，具有成绩单分析和内容生成。

<div align="center">
<a href="https://github.com/voltagent/voltagent/tree/main/examples/with-youtube">
<img width="800" alt="youtube-agent" src="https://github.com/user-attachments/assets/6aa65d69-33c3-4c32-b5b2-2e9b5c8e8e8f" />
</a>
</div>

[查看示例 →](https://github.com/voltagent/voltagent/tree/main/examples/with-youtube)

### AI 广告生成代理（Instagram Reels）

为 Instagram Reels 生成 AI 驱动的广告创意，包括视频生成和字幕。

<div align="center">
<a href="https://github.com/voltagent/voltagent/tree/main/examples/ai-ads-generator">
<img width="800" alt="instagram-agent" src="https://github.com/user-attachments/assets/7aa65d69-33c3-4c32-b5b2-2e9b5c8e8e90" />
</a>
</div>

[查看示例 →](https://github.com/voltagent/voltagent/tree/main/examples/ai-ads-generator)

### AI 配方代理

一个智能配方助手，可以根据可用配料建议食谱，进行膳食规划并提供营养信息。

<div align="center">
<a href="https://github.com/voltagent/voltagent/tree/main/examples/with-recipe-agent">
<img width="800" alt="recipe-agent" src="https://github.com/user-attachments/assets/8aa65d69-33c3-4c32-b5b2-2e9b5c8e8e91" />
</a>
</div>

[查看示例 →](https://github.com/voltagent/voltagent/tree/main/examples/with-recipe-agent)

### AI 研究代理

一个复杂的研究代理，可以从多个来源收集信息、综合发现并生成全面的报告。

<div align="center">
<a href="https://github.com/voltagent/voltagent/tree/main/examples/with-research-agent">
<img width="800" alt="research-agent" src="https://github.com/user-attachments/assets/9aa65d69-33c3-4c32-b5b2-2e9b5c8e8e92" />
</a>
</div>

[查看示例 →](https://github.com/voltagent/voltagent/tree/main/examples/with-research-agent)

[浏览所有示例 →](https://github.com/voltagent/voltagent/tree/main/examples)

## 用例

使用 VoltAgent 构建强大的 AI 代理用于：

- **HR 代理**：自动化招聘、入职和员工查询，具有上下文感知响应
- **客户支持代理**：使用工具集成（订单查找、票证创建）和记忆处理多轮对话
- **销售团队**：潜在客户资格认证、后续自动化和 CRM 集成，具有多代理协调
- **财务代理**：费用批准、预算跟踪和使用工作流进行财务报告
- **开发代理**：代码审查、文档生成和 CI/CD 自动化
- **营销代理**：内容生成、社交媒体管理和活动分析
- **法律代理**：合同审查、合规性检查和文档分析
- **保险代理**：索赔处理、承保和客户服务
- **工业代理**：供应链优化、库存管理和质量控制
- **教育代理**：个性化辅导、评分自动化和学生支持
- **政府代理**：公民服务、许可处理和政策分析
- **文档代理**：文档生成、翻译和知识管理

## 学习

- **[从互动式教程开始](https://voltagent.dev/tutorial)** - 通过构建真实的代理学习 VoltAgent
- **[文档](https://voltagent.dev/docs/)** - 完整的 API 参考和指南
- **[示例](https://github.com/voltagent/voltagent/tree/main/examples)** - 生产就绪的代理实现
- **[博客](https://voltagent.dev/blog/)** - 教程和最佳实践

## 社区和支持

- **[Discord](https://s.voltagent.dev/discord)** - 加入我们的社区以获得帮助和讨论
- **[GitHub 讨论](https://github.com/voltagent/voltagent/discussions)** - 提问并分享您的项目
- **[Twitter](https://twitter.com/voltagent_dev)** - 关注更新和公告

## 贡献

我们欢迎贡献！查看我们的[贡献指南](CONTRIBUTING.md)以开始使用。

## 贡献者 ♥️ 感谢

非常感谢每个参与 VoltAgent 之旅的人，无论您是构建了插件、开启了问题、提交了拉取请求，还是只是在 Discord 或 GitHub 讨论中帮助了某人。

VoltAgent 是一个社区努力，因为有您这样的人，它一直在变得更好。

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent)

您的星星帮助我们接触更多开发者！如果您发现 VoltAgent 有用，请考虑在 GitHub 上给我们一个星星以支持项目并帮助其他人发现它。

## 许可证

根据 MIT 许可证授权，版权所有 © 2025 至今 VoltAgent。
