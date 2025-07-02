<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
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
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">예제</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">블로그</a>
</div>
</div>

<br/>

<div align="center">
    <strong>VoltAgent는 AI 에이전트를 구축하고 오케스트레이션하기 위한 오픈 소스 TypeScript 프레임워크입니다.</strong><br>
노코드 빌더의 제한과 처음부터 시작하는 복잡성에서 벗어나세요.
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

## VoltAgent란 무엇인가요?

> **AI 에이전트 프레임워크**는 자율 에이전트에 의해 구동되는 애플리케이션을 구축하는 데 필요한 기초 구조와 도구를 제공합니다. 이러한 에이전트는 종종 대규모 언어 모델(LLM)에 의해 구동되며, 환경을 인식하고 결정을 내리며 특정 목표를 달성하기 위한 행동을 취할 수 있습니다. 이러한 에이전트를 처음부터 구축하려면 LLM과의 복잡한 상호작용 관리, 상태 처리, 외부 도구 및 데이터 연결, 워크플로 오케스트레이션이 필요합니다.

**VoltAgent**는 이러한 필수 툴킷 역할을 하는 오픈 소스 TypeScript 프레임워크입니다. 모듈식 빌딩 블록, 표준화된 패턴, 추상화를 제공하여 AI 에이전트 애플리케이션 개발을 단순화합니다. 챗봇, 가상 어시스턴트, 자동화 워크플로 또는 복잡한 멀티 에이전트 시스템을 만들든, VoltAgent는 기반 복잡성을 처리하여 에이전트의 기능과 로직 정의에 집중할 수 있게 합니다.

모든 것을 처음부터 구축하는 대신, VoltAgent는 즉시 사용 가능한 모듈식 빌딩 블록을 제공합니다:

- **코어 엔진(`@voltagent/core`)**: VoltAgent의 핵심으로, AI 에이전트를 위한 기본 기능을 제공하며 특정 역할, 도구, 메모리를 가진 개별 에이전트를 정의합니다.
- **멀티 에이전트 시스템**: 감독자를 사용하여 여러 전문 에이전트를 조정함으로써 복잡한 애플리케이션을 설계합니다.
- **확장 가능한 패키지**: 음성 상호작용을 위한 `@voltagent/voice`와 같은 패키지로 기능을 향상시킵니다.
- **도구 및 통합**: 에이전트에 외부 API, 데이터베이스, 서비스에 연결하는 도구를 장착하여 실제 작업을 수행할 수 있게 합니다. **표준화된 도구 상호작용을 위한 [모델 컨텍스트 프로토콜(MCP)](https://modelcontextprotocol.io/)을 지원합니다.**
- **데이터 검색 및 RAG**: 효율적인 정보 검색과 **검색 증강 생성(RAG)**을 위한 전문 검색기 에이전트를 구현합니다.
- **메모리**: 에이전트가 과거 상호작용을 기억하여 더 자연스럽고 맥락을 인식하는 대화를 가능하게 합니다.
- **LLM 호환성**: OpenAI, Google, Anthropic 등의 인기 AI 모델과 함께 작동하여 쉬운 전환을 가능하게 합니다.
- **개발자 생태계**: 빠른 설정, 모니터링, 디버깅을 위한 `create-voltagent-app`, `@voltagent/cli`, 시각적 [VoltOps LLM 관찰 가능성 플랫폼](https://console.voltagent.dev)과 같은 헬퍼를 포함합니다.

본질적으로, VoltAgent는 개발자가 반복적인 설정과 간단한 도구의 제한을 피하면서 더 빠르고 안정적으로 정교한 AI 애플리케이션을 구축할 수 있도록 도와줍니다.

## 왜 VoltAgent인가요?

AI 애플리케이션 구축에는 종종 트레이드오프가 수반됩니다:

1.  **DIY 접근법:** 기본적인 AI 제공자 도구 사용은 제어권을 제공하지만 복잡하고 관리하기 어려운 코드와 반복적인 노력으로 이어집니다.
2.  **노코드 빌더:** 처음에는 더 간단하지만 종종 제한적이어서 커스터마이제이션, 제공자 선택, 복잡성을 제한합니다.

VoltAgent는 유연성을 희생하지 않으면서 구조와 컴포넌트를 제공하는 중간 지점을 제공합니다:

- **더 빠른 구축**: 처음부터 시작하는 것과 비교해 사전 구축된 컴포넌트로 개발을 가속화합니다.
- **유지 관리 가능한 코드**: 더 쉬운 업데이트와 디버깅을 위한 조직화를 장려합니다.
- **확장성**: 간단하게 시작해서 복잡한 워크플로를 처리하는 복잡한 멀티 에이전트 시스템으로 쉽게 확장합니다.
- **유연성**: 에이전트 동작, LLM 선택, 도구 통합, UI 연결에 대한 완전한 제어권.
- **락인 방지**: 필요에 따라 AI 제공자와 모델을 자유롭게 전환할 수 있는 자유.
- **비용 효율성**: AI 서비스 사용을 최적화하고 중복 호출을 줄이도록 설계된 기능.
- **시각적 모니터링**: [VoltOps LLM 관찰 가능성 플랫폼](https://console.voltagent.dev)을 사용하여 에이전트 성능을 추적하고 상태를 검사하며 시각적으로 디버그합니다.

VoltAgent는 개발자가 간단한 헬퍼부터 복잡한 시스템까지 상상한 AI 애플리케이션을 효율적으로 구축할 수 있게 합니다.

## ⚡ 빠른 시작

`create-voltagent-app` CLI 도구를 사용하여 몇 초 만에 새로운 VoltAgent 프로젝트를 생성하세요:

```bash
npm create voltagent-app@latest
```

이 명령은 설정을 안내합니다.

VoltAgent 프레임워크를 시작하기 위한 스타터 코드가 `src/index.ts`에 표시됩니다.

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai"; // 예시 제공자
import { openai } from "@ai-sdk/openai"; // 예시 모델

// 간단한 에이전트 정의
const agent = new Agent({
  name: "my-agent",
  instructions: "도구를 사용하지 않고 질문에 답하는 유용한 어시스턴트",
  // 참고: VercelAIProvider와 openai를 다른 지원되는 제공자/모델로 교체할 수 있습니다
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// 에이전트로 VoltAgent 초기화
new VoltAgent({
  agents: {
    agent,
  },
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

[![VoltAgent VoltOps Platform Demo](https://github.com/user-attachments/assets/0adbec33-1373-4cf4-b67d-825f7baf1cb4)](https://console.voltagent.dev/)

## 주요 기능

- **에이전트 코어:** 설명, LLM 제공자, 도구, 메모리 관리로 에이전트를 정의합니다.
- **멀티 에이전트 시스템:** 여러 전문 서브 에이전트를 조정하는 감독자 에이전트를 사용하여 복잡한 워크플로를 구축합니다.
- **도구 사용 및 라이프사이클:** 타입 안전성(Zod), 라이프사이클 훅, 취소 지원을 갖춘 커스텀 또는 사전 구축 도구(함수)로 에이전트를 장착하여 외부 시스템과 상호작용합니다.
- **유연한 LLM 지원:** 다양한 LLM 제공자(OpenAI, Anthropic, Google 등)와 원활하게 통합하고 모델 간 쉬운 전환을 가능하게 합니다.
- **메모리 관리:** 다양한 구성 가능한 메모리 제공자를 사용하여 에이전트가 상호작용 간 컨텍스트를 유지할 수 있게 합니다.
- **관찰 가능성 및 디버깅:** [VoltOps LLM 관찰 가능성 플랫폼](https://console.voltagent.dev)을 통해 에이전트 상태, 상호작용, 로그, 성능을 시각적으로 모니터링합니다.
- **커스텀 API 엔드포인트:** 고유한 커스텀 엔드포인트로 VoltAgent API 서버를 확장하여 코어 프레임워크 위에 전문 기능을 구축합니다.
- **음성 상호작용:** `@voltagent/voice` 패키지를 사용하여 음성 인식과 합성이 가능한 음성 지원 에이전트를 구축합니다.
- **데이터 검색 및 RAG:** 다양한 소스에서 효율적인 정보 검색과 **검색 증강 생성(RAG)**을 위한 전문 검색기 에이전트를 통합합니다.
- **모델 컨텍스트 프로토콜(MCP) 지원:** 확장된 기능을 위해 [MCP 표준](https://modelcontextprotocol.io/)을 준수하는 외부 도구 서버(HTTP/stdio)에 연결합니다.
- **프롬프트 엔지니어링 도구:** 에이전트를 위한 효과적인 프롬프트 작성 및 관리를 위해 `createPrompt`와 같은 유틸리티를 활용합니다.
- **프레임워크 호환성:** 기존 Node.js 애플리케이션 및 인기 프레임워크에 쉬운 통합을 위해 설계되었습니다.

## 사용 사례

VoltAgent는 다재다능하며 다양한 AI 기반 애플리케이션을 구동할 수 있습니다:

- **복잡한 워크플로 자동화:** 조정된 에이전트를 사용하여 다양한 도구, API, 결정 지점을 포함하는 다단계 프로세스를 오케스트레이션합니다.
- **지능형 데이터 파이프라인:** 다양한 소스에서 데이터를 가져오고, 처리하고, 분석하고, 변환하는 에이전트를 구축합니다.
- **AI 기반 내부 도구 및 대시보드:** 분석, 보고, 작업 자동화를 위해 AI를 활용하는 대화형 내부 애플리케이션을 생성하며, 종종 훅을 사용하여 UI와 통합됩니다.
- **자동화된 고객 지원 에이전트:** 컨텍스트(메모리)를 이해하고, 도구(예: 주문 상태 확인)를 사용하며, 복잡한 문제를 에스컬레이션할 수 있는 정교한 챗봇을 개발합니다.
- **리포지토리 분석 및 코드베이스 자동화:** 코드 리포지토리를 분석하고, 리팩토링 작업을 자동화하고, 문서를 생성하거나 CI/CD 프로세스를 관리합니다.
- **검색 증강 생성(RAG) 시스템:** 정보에 기반한 응답을 생성하기 전에 지식 베이스에서 관련 정보를 검색하는(검색기 에이전트 사용) 에이전트를 구축합니다.
- **음성 제어 인터페이스 및 애플리케이션:** `@voltagent/voice` 패키지를 활용하여 음성 언어에 응답하고 생성하는 애플리케이션을 만듭니다.
- **개인화된 사용자 경험:** 메모리에 저장된 사용자 기록과 선호도에 기반하여 응답과 행동을 적응시키는 에이전트를 개발합니다.
- **실시간 모니터링 및 알림:** 데이터 스트림이나 시스템을 지속적으로 모니터링하고 정의된 조건에 따라 행동이나 알림을 트리거하는 에이전트를 설계합니다.
- **그리고 사실상 모든 것...:** AI 에이전트가 할 수 있다고 상상할 수 있다면, VoltAgent가 구축하는 데 도움을 줄 수 있을 것입니다! ⚡

## VoltAgent 학습하기

- **[문서](https://voltagent.dev/docs/):** 가이드, 개념, 튜토리얼을 깊이 있게 살펴보세요.
- **[예제](https://github.com/voltagent/voltagent/tree/main/examples):** 실용적인 구현을 탐색해보세요.
- **[블로그](https://voltagent.dev/blog/):** 기술적 통찰력과 모범 사례에 대해 더 읽어보세요.

## 기여

저희는 기여를 환영합니다! 기여 가이드라인을 참조해주세요(가능한 경우 링크 필요). 질문과 토론을 위해 저희 [Discord](https://s.voltagent.dev/discord) 서버에 참여하세요.

## 기여자 ♥️ 감사합니다

플러그인을 구축했든, 이슈를 열었든, 풀 리퀘스트를 제출했든, 아니면 단순히 Discord나 GitHub 토론에서 누군가를 도왔든, VoltAgent 여정의 일부가 된 모든 분들께 진심으로 감사드립니다.

VoltAgent는 커뮤니티의 노력이며, 여러분과 같은 사람들 덕분에 계속해서 더 나아지고 있습니다.

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent)

여러분의 스타는 더 많은 개발자에게 다가가는 데 도움이 됩니다! VoltAgent가 유용하다고 생각하신다면, 프로젝트를 지원하고 다른 사람들이 발견할 수 있도록 GitHub에서 스타를 주는 것을 고려해주세요.

## 라이선스

MIT 라이선스 하에 라이선스가 부여됩니다, Copyright © 2025-present VoltAgent.
