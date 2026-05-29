<div align="center">
<a href="https://voltagent.dev/">
<img width="1500" height="276" alt="voltagent" src="https://github.com/user-attachments/assets/d9ad69bd-b905-42a3-81af-99a0581348c0" />
</a>

<h3 align="center">
AI 에이전트 엔지니어링 플랫폼
</h3>

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
⭐ 마음에 드시면 스타를 눌러주세요 ⬆️
</h3>

VoltAgent는 두 가지 주요 부분으로 구성된 엔드투엔드 AI 에이전트 엔지니어링 플랫폼입니다:

- **[오픈소스 TypeScript 프레임워크](#core-framework)** – 메모리, RAG, 가드레일, 도구, MCP, 음성, 워크플로 등.
- **[VoltOps 콘솔](#voltops-console)** `클라우드` `셀프 호스팅` – 관찰 가능성, 자동화, 배포, 평가, 가드레일, 프롬프트 등.

완전한 코드 제어로 에이전트를 구축하고 프로덕션 준비된 가시성과 운영으로 출시하세요.

<h2 id="core-framework">코어 TypeScript 프레임워크</h2>

오픈소스 프레임워크를 사용하면 모든 AI 제공자에 연결하면서 메모리, 도구, 다단계 워크플로를 갖춘 지능형 에이전트를 구축할 수 있습니다. 전문화된 에이전트가 감독자 조정 하에 함께 작동하는 정교한 멀티 에이전트 시스템을 만드세요.

- **[코어 런타임](https://voltagent.dev/docs/agents/overview/) (`@voltagent/core`)**: 타입이 지정된 역할, 도구, 메모리, 모델 제공자를 한 곳에 정의하여 모든 것을 체계적으로 유지하세요.
- **[워크플로 엔진](https://voltagent.dev/docs/workflows/overview/)**: 커스텀 제어 흐름을 연결하는 대신 다단계 자동화를 선언적으로 설명하세요.
- **[감독자 & 서브 에이전트](https://voltagent.dev/docs/agents/sub-agents/)**: 작업을 라우팅하고 동기화를 유지하는 감독자 런타임 하에 전문화된 에이전트 팀을 실행하세요.
- **[도구 레지스트리](https://voltagent.dev/docs/agents/tools/) & [MCP](https://voltagent.dev/docs/agents/mcp/)**: 라이프사이클 훅과 취소 기능을 갖춘 Zod 타입 도구를 제공하고, 추가 글루 코드 없이 [모델 컨텍스트 프로토콜](https://modelcontextprotocol.io/) 서버에 연결하세요.
- **[LLM 호환성](https://voltagent.dev/docs/getting-started/providers-models/)**: 에이전트 로직을 다시 작성하지 않고 구성을 변경하여 OpenAI, Anthropic, Google 또는 다른 제공자 간 전환하세요.
- **[메모리](https://voltagent.dev/docs/agents/memory/overview/)**: 내구성 있는 메모리 어댑터를 연결하여 에이전트가 실행 간 중요한 컨텍스트를 기억하도록 하세요.
- **[검색 & RAG](https://voltagent.dev/docs/rag/overview/)**: 데이터 소스에서 사실을 가져오고 모델이 답변하기 전에 응답을 기반으로 하는(RAG) 검색기 에이전트를 연결하세요.
- **[VoltAgent 지식 베이스](https://voltagent.dev/docs/rag/voltagent/)**: 문서 수집, 청킹, 임베딩, 검색을 위한 매니지드 RAG 서비스를 사용하세요.
- **[음성](https://voltagent.dev/docs/agents/voice/)**: OpenAI, ElevenLabs 또는 커스텀 음성 제공자로 텍스트 음성 변환 및 음성 텍스트 변환 기능을 추가하세요.
- **[가드레일](https://voltagent.dev/docs/guardrails/overview/)**: 런타임에 에이전트 입력 또는 출력을 가로채고 검증하여 콘텐츠 정책 및 안전 규칙을 적용하세요.
- **[평가](https://voltagent.dev/docs/evals/overview/)**: 워크플로와 함께 에이전트 평가 스위트를 실행하여 에이전트 동작을 측정하고 개선하세요.

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

[![VoltAgent Demo](https://github.com/user-attachments/assets/26340c6a-be34-48a5-9006-e822bf6098a7)](https://github.com/user-attachments/assets/26340c6a-be34-48a5-9006-e822bf6098a7)

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

[![expense-approval](https://github.com/user-attachments/assets/3d3ea67b-4ab5-4dc0-932d-cedd92894b18)](https://github.com/user-attachments/assets/3d3ea67b-4ab5-4dc0-932d-cedd92894b18)

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

## 예제

더 많은 예제는 [예제 리포지토리](https://github.com/VoltAgent/voltagent/tree/main/examples)를 방문하세요.

- **[Airtable 에이전트](https://voltagent.dev/recipes-and-guides/airtable-agent)** - 새 레코드에 반응하고 VoltOps 액션으로 Airtable에 업데이트를 작성합니다.
- **[Slack 에이전트](https://voltagent.dev/recipes-and-guides/slack-agent)** - 채널 메시지에 응답하고 VoltOps Slack 액션으로 답장합니다.
- **[ChatGPT 앱과 VoltAgent](https://voltagent.dev/examples/agents/chatgpt-app)** - VoltAgent를 MCP를 통해 배포하고 ChatGPT 앱에 연결합니다.
- **[WhatsApp 주문 에이전트](https://voltagent.dev/examples/agents/whatsapp-ai-agent)** - 자연스러운 대화로 음식 주문을 처리하는 WhatsApp 챗봇을 구축합니다. ([소스 코드](https://github.com/VoltAgent/voltagent/tree/main/examples/with-whatsapp))
- **[YouTube to 블로그 에이전트](https://voltagent.dev/examples/agents/youtube-blog-agent)** - MCP 도구를 사용한 감독자 에이전트로 YouTube 비디오를 Markdown 블로그 게시물로 변환합니다. ([소스 코드](https://github.com/VoltAgent/voltagent/tree/main/examples/with-youtube-to-blog))
- **[AI 광고 생성 에이전트](https://voltagent.dev/examples/agents/ai-instagram-ad-agent)** - BrowserBase Stagehand와 Google Gemini AI를 사용하여 Instagram 광고를 생성합니다. ([소스 코드](https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator))
- **[AI 레시피 생성 에이전트](https://voltagent.dev/examples/agents/recipe-generator)** - 재료와 선호도에 따라 개인화된 요리 제안을 만듭니다. ([소스 코드](https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator) | [비디오](https://youtu.be/KjV1c6AhlfY))
- **[AI 연구 어시스턴트 에이전트](https://voltagent.dev/examples/agents/research-assistant)** - 포괄적인 보고서를 생성하는 멀티 에이전트 연구 워크플로. ([소스 코드](https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant) | [비디오](https://youtu.be/j6KAUaoZMy4))

<h2 id="voltops-console">VoltOps 콘솔: LLM 관찰 가능성 - 자동화 - 배포</h2>

VoltOps 콘솔은 VoltAgent의 플랫폼 측면으로, 관찰 가능성, 자동화, 배포를 제공하여 실시간 실행 추적, 성능 메트릭, 시각적 대시보드로 프로덕션 에이전트를 모니터링하고 디버그할 수 있습니다.

🎬 [라이브 데모 체험](https://console.voltagent.dev/demo)

📖 [VoltOps 문서](https://voltagent.dev/voltops-llm-observability-docs/)

🚀 [VoltOps 플랫폼](https://voltagent.dev/voltops-llm-observability/)

### 관찰 가능성 & 추적

상세한 추적 및 성능 메트릭으로 에이전트 실행 흐름을 깊이 있게 살펴보세요.

<img alt="1" src="https://github.com/user-attachments/assets/21c6d05d-f333-4c61-9218-8862d16110fd" />

### 대시보드

모든 에이전트, 워크플로 및 시스템 성능 메트릭에 대한 포괄적인 개요를 얻으세요.

<img alt="dashboar" src="https://github.com/user-attachments/assets/c88a5543-219e-4cf0-8f41-14a68ca297fb" />

### 로그

모든 에이전트 상호작용 및 워크플로 단계에 대한 상세한 실행 로그를 추적하세요.

![VoltOps Logs](https://cdn.voltagent.dev/console/logs.png)

### 메모리 관리

에이전트 메모리, 컨텍스트 및 대화 기록을 검사하고 관리하세요.

![VoltOps Memory Overview](https://cdn.voltagent.dev/console/memory.png)

### 추적

에이전트 동작을 이해하고 성능을 최적화하기 위해 완전한 실행 추적을 분석하세요.

![VoltOps Traces](https://cdn.voltagent.dev/console/traces.png)

### 프롬프트 빌더

콘솔에서 직접 프롬프트를 설계, 테스트 및 개선하세요.

<img alt="prompts" src="https://github.com/user-attachments/assets/fb6d71eb-8f81-4443-a494-08c33ec9bcc4" />

### 배포

원클릭 GitHub 통합 및 매니지드 인프라로 에이전트를 프로덕션에 배포하세요.

<img alt="deployment" src="https://github.com/user-attachments/assets/e329ab4b-7464-435a-96cc-90214e8a3cfa" />

📖 [VoltOps 배포 문서](https://voltagent.dev/docs/deployment/voltops/)

### 트리거 & 액션

웹훅, 스케줄, 커스텀 트리거로 에이전트 워크플로를 자동화하여 외부 이벤트에 반응하세요.

<img width="1277" alt="triggers" src="https://github.com/user-attachments/assets/67e36934-2eb5-4cf1-94f8-3057d805ef65" />

### 모니터링

전체 시스템에서 에이전트 상태, 성능 메트릭 및 리소스 사용량을 모니터링하세요.

<img alt="monitoring" src="https://github.com/user-attachments/assets/1fd1151f-5ee4-4c7c-8ec7-29874e37c48f" />

### 가드레일

에이전트가 정의된 매개변수 내에서 작동하도록 안전 경계 및 콘텐츠 필터를 설정하세요.

<img alt="guardrails" src="https://github.com/user-attachments/assets/52bd51f0-944e-4202-9f54-7bb2e0e2d1f6" />

### 평가

벤치마크에 대해 에이전트 동작, 정확도 및 성능을 테스트하는 평가 스위트를 실행하세요.

<img alt="evals" src="https://github.com/user-attachments/assets/510cc180-2661-4973-a48f-074d4703d90b" />

### RAG (지식 베이스)

내장된 검색 증강 생성 기능으로 에이전트를 지식 소스에 연결하세요.

<img alt="rag" src="https://github.com/user-attachments/assets/a6c2f668-7ad1-4fb6-b67f-654335285f1e" />

## VoltAgent 학습하기

- **[대화형 튜토리얼로 시작](https://voltagent.dev/tutorial/introduction/)**하여 AI 에이전트 구축의 기본을 배우세요.
- **[문서](https://voltagent.dev/docs/)**: 가이드, 개념 및 튜토리얼을 깊이 있게 살펴보세요.
- **[예제](https://github.com/voltagent/voltagent/tree/main/examples)**: 실용적인 구현을 탐색하세요.
- **[블로그](https://voltagent.dev/blog/)**: 기술적 통찰력 및 모범 사례에 대해 더 읽어보세요.

## 기여

저희는 기여를 환영합니다! 기여 가이드라인을 참조해주세요(가능한 경우 링크 필요). 질문과 토론을 위해 저희 [Discord](https://s.voltagent.dev/discord) 서버에 참여하세요.

## 기여자 ♥️ 감사합니다

플러그인을 구축했든, 이슈를 열었든, 풀 리퀘스트를 제출했든, 아니면 단순히 Discord나 GitHub 토론에서 누군가를 도왔든, VoltAgent 여정의 일부가 된 모든 분들께 진심으로 감사드립니다.

VoltAgent는 커뮤니티의 노력이며, 여러분과 같은 사람들 덕분에 계속해서 더 나아지고 있습니다.

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent&max=500&columns=20&anon=1)

## 라이선스

MIT 라이선스 하에 라이선스가 부여됩니다, Copyright © 2026-present VoltAgent.
