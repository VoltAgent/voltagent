<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/9259e833-0f5c-4eb6-8cc7-4e6930cc27e1" />
</a>

<br/>
<br/>
<div align="center">
<a href="../README.md">English</a> | <a href="README-cn-traditional.md">繁體中文</a> | <a href="README-cn-bsc.md">简体中文</a> | <a href="README-jp.md">日本語</a> | 한국어
</div>

<br/>

<div align="center">
    <a href="https://voltagent.dev">홈페이지</a> |
    <a href="https://voltagent.dev/docs/">문서</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">예제</a>
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

**VoltAgent**는 AI 에이전트를 구축하고 오케스트레이션하기 위한 오픈 소스 TypeScript 프레임워크입니다.
메모리, 워크플로, 도구, 그리고 내장된 LLM 관찰 가능성을 갖춘 프로덕션급 에이전트를 구축할 수 있습니다.

## 왜 VoltAgent인가요?

- **첫날부터 프로덕션 준비**: 인프라를 처음부터 구축하는 대신 내장 메모리, 워크플로, 관찰 가능성을 갖춘 에이전트를 배포하세요.
- **자신감 있게 코딩**: 전체 에이전트 시스템에서 타입 안전 도구, 자동 추론, 컴파일 타임 안전성을 갖춘 완전한 TypeScript 지원.
- **프로처럼 디버그**: 내장 VoltOps 관찰 가능성으로 모든 결정을 추적하고, 성능을 모니터링하며, 외부 도구 없이 실시간으로 워크플로를 최적화하세요.
- **복잡한 시스템을 간단하게 구축**: 프로토타입에서 프로덕션까지 확장되는 감독자 조정, 선언적 워크플로, 모듈식 아키텍처로 멀티 에이전트 팀을 오케스트레이션하세요.

## 에이전트 개발 플랫폼

VoltAgent는 두 가지 보완적인 도구를 통해 AI 에이전트를 개발하고 모니터링하기 위한 완전한 플랫폼을 제공합니다.

### 코어 프레임워크

코어 프레임워크를 사용하면 모든 AI 제공자에 연결하면서 메모리, 도구, 다단계 워크플로를 갖춘 지능형 에이전트를 구축할 수 있습니다. 전문화된 에이전트가 감독자 조정 하에 함께 작동하는 정교한 멀티 에이전트 시스템을 만드세요.

- **[코어 런타임](https://voltagent.dev/docs/agents/overview/) (`@voltagent/core`)**: 타입이 지정된 역할, 도구, 메모리, 모델 제공자를 한 곳에 정의하여 모든 것을 체계적으로 유지하세요.
- **[워크플로 엔진](https://voltagent.dev/docs/workflows/overview/)**: 커스텀 제어 흐름을 연결하는 대신 다단계 자동화를 선언적으로 설명하세요.
- **[감독자 & 서브 에이전트](https://voltagent.dev/docs/agents/sub-agents/)**: 작업을 라우팅하고 동기화를 유지하는 감독자 런타임 하에 전문화된 에이전트 팀을 실행하세요.
- **[도구 레지스트리](https://voltagent.dev/docs/agents/tools/) & [MCP](https://voltagent.dev/docs/agents/mcp/)**: 라이프사이클 훅과 취소 기능을 갖춘 Zod 타입 도구를 제공하고, 추가 글루 코드 없이 [모델 컨텍스트 프로토콜](https://modelcontextprotocol.io/) 서버에 연결하세요.
- **[LLM 호환성](https://voltagent.dev/docs/getting-started/providers-models/)**: 에이전트 로직을 다시 작성하지 않고 구성을 변경하여 OpenAI, Anthropic, Google 또는 다른 제공자 간 전환하세요.
- **[메모리](https://voltagent.dev/docs/agents/memory/overview/)**: 내구성 있는 메모리 어댑터를 연결하여 에이전트가 실행 간 중요한 컨텍스트를 기억하도록 하세요.
- **[검색 & RAG](https://voltagent.dev/docs/rag/overview/)**: 데이터 소스에서 사실을 가져오고 모델이 답변하기 전에 응답을 기반으로 하는(RAG) 검색기 에이전트를 연결하세요.
- **[평가](https://voltagent.dev/docs/evals/overview/)**: 워크플로와 함께 에이전트 평가 스위트를 실행하여 가드레일을 더 빠르게 제공하세요.

### VoltOps LLM 관찰 가능성 플랫폼

VoltAgent는 상세한 실행 추적, 성능 메트릭, 시각적 대시보드로 에이전트를 실시간으로 모니터링하고 디버그하기 위한 내장 [VoltOps](#built-in-llm-observability-with-voltops) LLM 관찰 가능성과 함께 제공됩니다. 에이전트가 내리는 모든 결정을 검사하고, 도구 사용을 추적하며, 내장 OpenTelemetry 기반 관찰 가능성으로 워크플로를 최적화하세요.

#### MCP 서버 (@voltagent/mcp-docs-server)

Claude, Cursor 또는 Windsurf와 같은 AI 기반 코딩 어시스턴트를 위해 LLM에게 VoltAgent 사용법을 가르치기 위해 MCP 서버 `@voltagent/mcp-docs-server`를 사용할 수 있습니다. 이를 통해 AI 어시스턴트가 코딩하는 동안 VoltAgent 문서, 예제, 변경 로그에 직접 액세스할 수 있습니다.

📖 [MCP 문서 서버 설정 방법](https://voltagent.dev/docs/getting-started/mcp-docs-server/)

## ⚡ 빠른 시작

`create-voltagent-app` CLI 도구를 사용하여 몇 초 만에 새로운 VoltAgent 프로젝트를 생성하세요:

```bash
npm create voltagent-app@latest
```

이 명령은 설정을 안내합니다.

이제 에이전트와 포괄적인 워크플로 예제를 모두 등록하는 `src/index.ts`에서 스타터 코드를 볼 수 있으며, 워크플로 예제는 `src/workflows/index.ts`에서 찾을 수 있습니다.

```typescript
import { VoltAgent, Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { openai } from "@ai-sdk/openai";
import { expenseApprovalWorkflow } from "./workflows";
import { weatherTool } from "./tools";

// 로거 인스턴스 생성
const logger = createPinoLogger({
  name: "my-agent-app",
  level: "info",
});

// 선택적 영구 메모리 (기본 인메모리를 사용하려면 제거)
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
});

// 프로젝트를 위한 간단한 범용 에이전트
const agent = new Agent({
  name: "my-agent",
  instructions: "날씨를 확인하고 다양한 작업을 도울 수 있는 유용한 어시스턴트",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  memory,
});

// 에이전트 및 워크플로로 VoltAgent 초기화
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

그 후, 프로젝트로 이동하여 실행하세요:

```bash
npm run dev
```

dev 명령을 실행하면 tsx가 코드를 컴파일하고 실행합니다. 터미널에 VoltAgent 서버 시작 메시지가 표시되어야 합니다:

```
══════════════════════════════════════════════════
VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
✓ HTTP Server: http://localhost:3141

Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
```

에이전트가 이제 실행 중입니다! 상호작용하려면:

1. 콘솔 열기: 터미널 출력의 [VoltOps LLM 관찰 가능성 플랫폼](https://console.voltagent.dev) 링크를 클릭하세요(또는 브라우저에 복사하여 붙여넣기).
2. 에이전트 찾기: VoltOps LLM 관찰 가능성 플랫폼 페이지에서 에이전트가 나열된 것을 볼 수 있어야 합니다(예: "my-agent").
3. 에이전트 세부정보 열기: 에이전트 이름을 클릭하세요.
4. 채팅 시작: 에이전트 세부정보 페이지에서 오른쪽 하단의 채팅 아이콘을 클릭하여 채팅 창을 엽니다.
5. 메시지 보내기: "안녕하세요"와 같은 메시지를 입력하고 Enter를 누르세요.

![VoltAgent VoltOps Platform Demo](https://github.com/user-attachments/assets/0adbec33-1373-4cf4-b67d-825f7baf1cb4)

### 첫 번째 워크플로 실행하기

새 프로젝트에는 강력한 워크플로 엔진도 포함되어 있습니다.

비용 승인 워크플로는 일시 중단/재개 기능을 갖춘 휴먼 인 더 루프 자동화를 시연합니다:

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
  // 1단계: 비용 검증 및 승인 필요 여부 확인
  .andThen({
    id: "check-approval-needed",
    resumeSchema: z.object({
      approved: z.boolean(),
      managerId: z.string(),
      comments: z.string().optional(),
      adjustedAmount: z.number().optional(),
    }),
    execute: async ({ data, suspend, resumeData }) => {
      // 관리자의 결정으로 재개하는 경우
      if (resumeData) {
        return {
          ...data,
          approved: resumeData.approved,
          approvedBy: resumeData.managerId,
          finalAmount: resumeData.adjustedAmount || data.amount,
        };
      }

      // 관리자 승인이 필요한지 확인 ($500 초과 비용)
      if (data.amount > 500) {
        await suspend("Manager approval required", {
          employeeId: data.employeeId,
          requestedAmount: data.amount,
        });
      }

      // 소액 비용 자동 승인
      return {
        ...data,
        approved: true,
        approvedBy: "system",
        finalAmount: data.amount,
      };
    },
  })
  // 2단계: 최종 결정 처리
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

VoltOps 콘솔에서 직접 사전 구축된 `expenseApprovalWorkflow`를 테스트할 수 있습니다:

![VoltOps Workflow Observability](https://github.com/user-attachments/assets/9b877c65-f095-407f-9237-d7879964c38a)

1.  **워크플로 페이지로 이동**: 서버를 시작한 후 [워크플로 페이지](https://console.voltagent.dev/workflows)로 직접 이동하세요.
2.  **프로젝트 선택**: 프로젝트 선택기를 사용하여 프로젝트를 선택하세요(예: "my-agent-app").
3.  **찾기 및 실행**: **"Expense Approval Workflow"**가 나열된 것을 볼 수 있습니다. 클릭한 다음 **"Run"** 버튼을 클릭하세요.
4.  **입력 제공**: 워크플로는 비용 세부 정보가 포함된 JSON 객체를 예상합니다. 자동 승인을 위한 소액 비용을 시도해보세요:
    ```json
    {
      "employeeId": "EMP-123",
      "amount": 250,
      "category": "office-supplies",
      "description": "New laptop mouse and keyboard"
    }
    ```
5.  **결과 보기**: 실행 후 각 단계에 대한 상세 로그를 검사하고 콘솔에서 직접 최종 출력을 볼 수 있습니다.

## VoltOps를 통한 내장 LLM 관찰 가능성

VoltAgent는 에이전트를 실시간으로 모니터링, 디버그 및 최적화하는 데 도움이 되는 내장 LLM 관찰 가능성 플랫폼인 VoltOps와 함께 제공됩니다.

🎬 [라이브 데모 체험](https://console.voltagent.dev/demo)

📖 [VoltOps 문서](https://voltagent.dev/voltops-llm-observability-docs/)

🚀 [VoltOps 플랫폼](https://voltagent.dev/voltops-llm-observability/)

### 관찰 가능성 & 추적

상세한 추적 및 성능 메트릭으로 에이전트 실행 흐름을 깊이 있게 살펴보세요.

<br/>

![VoltOps Observability Overview](https://cdn.voltagent.dev/console/observability.png)

### 대시보드

모든 에이전트, 워크플로 및 시스템 성능 메트릭에 대한 포괄적인 개요를 얻으세요.

<br/>

![VoltOps Dashboard](https://cdn.voltagent.dev/console/dashboard.png)

### 로그

모든 에이전트 상호작용 및 워크플로 단계에 대한 상세한 실행 로그를 추적하세요.
<br/>

![VoltOps Logs](https://cdn.voltagent.dev/console/logs.png)

### 메모리 관리

에이전트 메모리, 컨텍스트 및 대화 기록을 검사하고 관리하세요.

<br/>

![VoltOps Memory Overview](https://cdn.voltagent.dev/console/memory.png)

### 추적

에이전트 동작을 이해하고 성능을 최적화하기 위해 완전한 실행 추적을 분석하세요.

<br/>

![VoltOps Traces](https://cdn.voltagent.dev/console/traces.png)

### 프롬프트 빌더

콘솔에서 직접 프롬프트를 설계, 테스트 및 개선하세요.

<br/>

![VoltOps Prompt Builder](https://cdn.voltagent.dev/console/prompt.png)

## 예제

완전한 소스 코드 및 비디오 튜토리얼과 함께 VoltAgent의 실제 구현을 탐색하세요.

더 많은 예제 및 사용 사례는 [예제 리포지토리](https://github.com/VoltAgent/voltagent/tree/main/examples)를 방문하세요.

### WhatsApp 주문 에이전트

자연스러운 대화를 통해 음식 주문을 처리하고, 데이터베이스에서 메뉴 항목을 관리하며, 완전한 대화 컨텍스트로 주문을 처리하는 WhatsApp 챗봇을 구축하세요.

<br/>

<img width="1111" height="347" alt="whatsapp" src="https://github.com/user-attachments/assets/dc9c4986-3e68-42f8-a450-ecd79b4dbd99" />

<br/>
<br/>

- 📖 [튜토리얼](https://voltagent.dev/examples/agents/whatsapp-ai-agent)
- 💻 [소스 코드](https://github.com/VoltAgent/voltagent/tree/main/examples/with-whatsapp)

### YouTube to 블로그 에이전트

MCP 도구, 공유 작업 메모리 및 VoltOps 관찰 가능성을 갖춘 서브 에이전트를 조정하는 감독자 에이전트를 사용하여 YouTube 비디오를 Markdown 블로그 게시물로 변환하세요.

<br/>

<img width="1113" height="363" alt="youtube" src="https://github.com/user-attachments/assets/f9c944cf-8a9a-4ac5-a5f9-860ce08f058b" />

<br/>
<br/>

- 📖 [튜토리얼](https://voltagent.dev/examples/agents/youtube-blog-agent)
- 💻 [소스 코드](https://github.com/VoltAgent/voltagent/tree/main/examples/with-youtube-to-blog)

### AI 광고 생성 에이전트

BrowserBase Stagehand를 사용하여 랜딩 페이지를 분석하고, 브랜드 데이터를 추출하며, Google Gemini AI를 통해 비주얼을 생성하는 Instagram 광고 생성기를 구현하세요.

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator">
<img width="1115" height="363" alt="instagram" src="https://github.com/user-attachments/assets/973e79c7-34ec-4f8e-8a41-9273d44234c6" />
</a>

<br/>
<br/>

- 📖 [튜토리얼](https://voltagent.dev/examples/agents/ai-instagram-ad-agent)
- 💻 [소스 코드](https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator)

### AI 레시피 생성 에이전트

사용 가능한 재료, 식단 선호도 및 시간 제약을 기반으로 개인화된 요리 제안을 생성하는 지능형 레시피 추천 시스템을 구축하세요.

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator">
<img width="1111" height="363" alt="cook" src="https://github.com/user-attachments/assets/dde6ce2f-c963-4075-9825-f216bc6e3467" />
</a>

<br/>
<br/>

- 📖 [튜토리얼](https://voltagent.dev/examples/agents/recipe-generator)
- 📹 [비디오 시청](https://youtu.be/KjV1c6AhlfY)
- 💻 [소스 코드](https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator)

### AI 연구 어시스턴트 에이전트

타입 안전 데이터 흐름으로 주제를 연구하고 포괄적인 보고서를 생성하기 위해 다양한 AI 에이전트가 협업하는 멀티 에이전트 연구 워크플로를 생성하세요.

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant">
<img width="2228" height="678" alt="research" src="https://github.com/user-attachments/assets/8f459748-132e-4ff3-9afe-0561fa5075c2" />
</a>

<br/>
<br/>

- 📖 [튜토리얼](https://voltagent.dev/examples/agents/research-assistant)
- 📹 [비디오 시청](https://youtu.be/j6KAUaoZMy4)
- 💻 [소스 코드](https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant)

## 사용 사례

다양한 산업 전반의 실제 비즈니스 요구 사항을 위한 AI 에이전트를 구축하세요:

- **[HR 에이전트](https://voltagent.dev/use-cases/hr-agent/)** - 채용, 직원 온보딩 및 HR 지원 작업을 자동화합니다.
- **[고객 지원 에이전트](https://voltagent.dev/use-cases/customer-support-agent/)** - 고객 질문 및 문제를 처리하는 지원 에이전트를 구축합니다.
- **[영업 팀](https://voltagent.dev/use-cases/sales-teams/)** - 리드를 검증하고, 고객 데이터를 수집하며, 영업 아웃리치를 개인화합니다.
- **[재무 에이전트](https://voltagent.dev/use-cases/finance-agent/)** - 송장을 관리하고, 비용을 추적하며, 재무 보고서를 생성합니다.
- **[개발 에이전트](https://voltagent.dev/use-cases/development-agent/)** - 코드를 검토하고, 배포를 관리하며, 개발 팀을 지원합니다.
- **[마케팅 에이전트](https://voltagent.dev/use-cases/marketing-agent/)** - 캠페인을 계획하고, 콘텐츠를 생성하며, 마케팅 성과를 분석합니다.
- **[법률 에이전트](https://voltagent.dev/use-cases/legal-agent/)** - 계약을 검토하고, 규정 준수를 확인하며, 법률 작업을 처리합니다.
- **[보험 에이전트](https://voltagent.dev/use-cases/insurance-agent/)** - 청구를 처리하고, 위험을 평가하며, 정책을 관리합니다.
- **[산업 에이전트](https://voltagent.dev/use-cases/industrial-agent/)** - 장비를 모니터링하고, 유지 보수 필요를 예측하며, 안전을 보장합니다.
- **[교육 에이전트](https://voltagent.dev/use-cases/education-agent/)** - 개인화된 튜터링을 제공하고, 학생 진행 상황을 추적하며, 학습을 지원합니다.
- **[정부 에이전트](https://voltagent.dev/use-cases/government-agent/)** - 허가 신청을 처리하고, 혜택을 처리하며, 시민을 서비스합니다.
- **[문서화 에이전트](https://voltagent.dev/use-cases/documentation-agent/)** - API 문서를 생성하고, 변경 로그를 작성하며, 코드에서 튜토리얼을 생성합니다.

## VoltAgent 학습하기

- 📖 **[대화형 튜토리얼로 시작](https://voltagent.dev/tutorial/introduction/)**하여 AI 에이전트 구축의 기본을 배우세요.
- **[문서](https://voltagent.dev/docs/)**: 가이드, 개념 및 튜토리얼을 깊이 있게 살펴보세요.
- **[예제](https://github.com/voltagent/voltagent/tree/main/examples)**: 실용적인 구현을 탐색하세요.
- **[블로그](https://voltagent.dev/blog/)**: 기술적 통찰력 및 모범 사례에 대해 더 읽어보세요.

## 기여

저희는 기여를 환영합니다! 기여 가이드라인을 참조해주세요(가능한 경우 링크 필요). 질문과 토론을 위해 저희 [Discord](https://s.voltagent.dev/discord) 서버에 참여하세요.

## 기여자 ♥️ 감사합니다

플러그인을 구축했든, 이슈를 열었든, 풀 리퀘스트를 제출했든, 아니면 단순히 Discord나 GitHub 토론에서 누군가를 도왔든, VoltAgent 여정의 일부가 된 모든 분들께 진심으로 감사드립니다.

VoltAgent는 커뮤니티의 노력이며, 여러분과 같은 사람들 덕분에 계속해서 더 나아지고 있습니다.

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent&max=100)

여러분의 스타는 더 많은 개발자에게 다가가는 데 도움이 됩니다! VoltAgent가 유용하다고 생각하신다면, 프로젝트를 지원하고 다른 사람들이 발견할 수 있도록 GitHub에서 스타를 주는 것을 고려해주세요.

## 라이선스

MIT 라이선스 하에 라이선스가 부여됩니다, Copyright © 2025-present VoltAgent.
