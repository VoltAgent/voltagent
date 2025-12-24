import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";

import { LangfuseLogo } from "@site/static/img/logos/observability/langfuse";
import { LangWatchLogo } from "@site/static/img/logos/observability/langwatch";
import { BraintrustLogo2 } from "../../../static/img/logos/observability/braintrust-2";
import { Dash0Logo } from "../../../static/img/logos/observability/dash0";
import HoneyhiveLogo from "../../../static/img/logos/observability/honeyhive.png";
import { LangSmithLogo } from "../../../static/img/logos/observability/langsmith";
import { NewRelicLogo } from "../../../static/img/logos/observability/new-relic";
import { SignozLogo } from "../../../static/img/logos/observability/signoz";
import TraceLogo from "../../../static/img/logos/observability/traceloop.png";

type ObservabilityTab =
  | "langfuse"
  | "langsmith"
  | "braintrust"
  | "dash0"
  | "langwatch"
  | "signoz"
  | "honeyhive"
  | "newRelic"
  | "traceLoop";

type TabData = {
  id: ObservabilityTab;
  name: string;
  description: string;
  isConnected: boolean;
  codeJSX: React.ReactNode;
  icon: React.ReactNode;
};

// Code examples in JSX format with proper syntax highlighting
const codeExamples = {
  langfuse: (
    <>
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ VoltAgent }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"@voltagent/core"</span>
      <br />
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ LangfuseExporter }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"langfuse-vercel"</span>
      <br />
      <br />
      <span className="text-purple-400">export const</span>{" "}
      <span className="text-gray-300">volt</span> <span className="text-gray-500">=</span>{" "}
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">VoltAgent({"{"}</span>
      <br />
      {"  "}
      <span className="text-gray-300">telemetry: {"{"}</span>
      <br />
      {"    "}
      <span className="text-gray-300">serviceName: </span>
      <span className="text-main-emerald">"ai"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">enabled: </span>
      <span className="text-purple-400">true</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">export: {"{"}</span>
      <br />
      {"      "}
      <span className="text-gray-300">type: </span>
      <span className="text-main-emerald">"custom"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"      "}
      <span className="text-gray-300">exporter: </span>
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">LangfuseExporter({"{"}</span>
      <br />
      {"        "}
      <span className="text-gray-300">publicKey: process.env.LANGFUSE_PUBLIC_KEY,</span>
      <br />
      {"        "}
      <span className="text-gray-300">secretKey: process.env.LANGFUSE_SECRET_KEY,</span>
      <br />
      {"        "}
      <span className="text-gray-300">baseUrl: process.env.LANGFUSE_BASEURL,</span>
      <br />
      {"      "}
      <span className="text-gray-300">{"}"}),</span>
      <br />
      {"    "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      {"  "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      <span className="text-gray-300">{"}"});</span>
    </>
  ),
  langsmith: (
    <>
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ VoltAgent }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"@voltagent/core"</span>
      <br />
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ PrometheusExporter }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"prometheus-exporter"</span>
      <br />
      <br />
      <span className="text-purple-400">export const</span>{" "}
      <span className="text-gray-300">volt</span> <span className="text-gray-500">=</span>{" "}
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">VoltAgent({"{"}</span>
      <br />
      {"  "}
      <span className="text-gray-300">telemetry: {"{"}</span>
      <br />
      {"    "}
      <span className="text-gray-300">serviceName: </span>
      <span className="text-main-emerald">"ai"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">enabled: </span>
      <span className="text-purple-400">true</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">export: {"{"}</span>
      <br />
      {"      "}
      <span className="text-gray-300">type: </span>
      <span className="text-main-emerald">"custom"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"      "}
      <span className="text-gray-300">exporter: </span>
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">PrometheusExporter({"{"}</span>
      <br />
      {"        "}
      <span className="text-gray-300">endpoint: process.env.PROMETHEUS_ENDPOINT,</span>
      <br />
      {"      "}
      <span className="text-gray-300">{"}"}),</span>
      <br />
      {"    "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      {"  "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      <span className="text-gray-300">{"}"});</span>
    </>
  ),
  braintrust: (
    <>
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ VoltAgent }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"@voltagent/core"</span>
      <br />
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">* as Sentry</span> <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"@sentry/node"</span>
      <br />
      <br />
      <span className="text-gray-300">Sentry.init({"{"}</span>
      <br />
      {"  "}
      <span className="text-gray-300">dsn: process.env.SENTRY_DSN,</span>
      <br />
      {"  "}
      <span className="text-gray-300">tracesSampleRate: 1.0,</span>
      <br />
      <span className="text-gray-300">{"}"});</span>
      <br />
      <br />
      <span className="text-purple-400">export const</span>{" "}
      <span className="text-gray-300">volt</span> <span className="text-gray-500">=</span>{" "}
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">VoltAgent({"{"}</span>
      <br />
      {"  "}
      <span className="text-gray-300">telemetry: {"{"}</span>
      <br />
      {"    "}
      <span className="text-gray-300">serviceName: </span>
      <span className="text-main-emerald">"ai"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">enabled: </span>
      <span className="text-purple-400">true</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">export: {"{"}</span>
      <br />
      {"      "}
      <span className="text-gray-300">type: </span>
      <span className="text-main-emerald">"sentry"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"      "}
      <span className="text-gray-300">exporter: Sentry,</span>
      <br />
      {"    "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      {"  "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      <span className="text-gray-300">{"}"});</span>
    </>
  ),
  dash0: (
    <>
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ VoltAgent }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"@voltagent/core"</span>
      <br />
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ DatadogExporter }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"datadog-agent"</span>
      <br />
      <br />
      <span className="text-purple-400">export const</span>{" "}
      <span className="text-gray-300">volt</span> <span className="text-gray-500">=</span>{" "}
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">VoltAgent({"{"}</span>
      <br />
      {"  "}
      <span className="text-gray-300">telemetry: {"{"}</span>
      <br />
      {"    "}
      <span className="text-gray-300">serviceName: </span>
      <span className="text-main-emerald">"ai"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">enabled: </span>
      <span className="text-purple-400">true</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">export: {"{"}</span>
      <br />
      {"      "}
      <span className="text-gray-300">type: </span>
      <span className="text-main-emerald">"custom"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"      "}
      <span className="text-gray-300">exporter: </span>
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">DatadogExporter({"{"}</span>
      <br />
      {"        "}
      <span className="text-gray-300">apiKey: process.env.DATADOG_API_KEY,</span>
      <br />
      {"      "}
      <span className="text-gray-300">{"}"}),</span>
      <br />
      {"    "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      {"  "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      <span className="text-gray-300">{"}"});</span>
    </>
  ),
  langwatch: (
    <>
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ VoltAgent }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"@voltagent/core"</span>
      <br />
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ OpenTelemetryExporter }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"opentelemetry-js"</span>
      <br />
      <br />
      <span className="text-purple-400">export const</span>{" "}
      <span className="text-gray-300">volt</span> <span className="text-gray-500">=</span>{" "}
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">VoltAgent({"{"}</span>
      <br />
      {"  "}
      <span className="text-gray-300">telemetry: {"{"}</span>
      <br />
      {"    "}
      <span className="text-gray-300">serviceName: </span>
      <span className="text-main-emerald">"ai"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">enabled: </span>
      <span className="text-purple-400">true</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">export: {"{"}</span>
      <br />
      {"      "}
      <span className="text-gray-300">type: </span>
      <span className="text-main-emerald">"opentelemetry"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"      "}
      <span className="text-gray-300">exporter: </span>
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">OpenTelemetryExporter({"{"}</span>
      <br />
      {"        "}
      <span className="text-gray-300">endpoint: process.env.OPENTELEMETRY_ENDPOINT,</span>
      <br />
      {"      "}
      <span className="text-gray-300">{"}"}),</span>
      <br />
      {"    "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      {"  "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      <span className="text-gray-300">{"}"});</span>
    </>
  ),
  signoz: (
    <>
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ VoltAgent }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"@voltagent/core"</span>
      <br />
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ OpenTelemetryExporter }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"opentelemetry-js"</span>
      <br />
      <br />
      <span className="text-purple-400">export const</span>{" "}
      <span className="text-gray-300">volt</span> <span className="text-gray-500">=</span>{" "}
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">VoltAgent({"{"}</span>
      <br />
      {"  "}
      <span className="text-gray-300">telemetry: {"{"}</span>
      <br />
      {"    "}
      <span className="text-gray-300">serviceName: </span>
      <span className="text-main-emerald">"ai"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">enabled: </span>
      <span className="text-purple-400">true</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">export: {"{"}</span>
      <br />
      {"      "}
      <span className="text-gray-300">type: </span>
      <span className="text-main-emerald">"opentelemetry"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"      "}
      <span className="text-gray-300">exporter: </span>
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">OpenTelemetryExporter({"{"}</span>
      <br />
      {"        "}
      <span className="text-gray-300">endpoint: process.env.OPENTELEMETRY_ENDPOINT,</span>
      <br />
      {"      "}
      <span className="text-gray-300">{"}"}),</span>
      <br />
      {"    "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      {"  "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      <span className="text-gray-300">{"}"});</span>
    </>
  ),
  honeyhive: (
    <>
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ VoltAgent }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"@voltagent/core"</span>
      <br />
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ OpenTelemetryExporter }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"opentelemetry-js"</span>
      <br />
      <br />
      <span className="text-purple-400">export const</span>{" "}
      <span className="text-gray-300">volt</span> <span className="text-gray-500">=</span>{" "}
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">VoltAgent({"{"}</span>
      <br />
      {"  "}
      <span className="text-gray-300">telemetry: {"{"}</span>
      <br />
      {"    "}
      <span className="text-gray-300">serviceName: </span>
      <span className="text-main-emerald">"ai"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">enabled: </span>
      <span className="text-purple-400">true</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">export: {"{"}</span>
      <br />
      {"      "}
      <span className="text-gray-300">type: </span>
      <span className="text-main-emerald">"opentelemetry"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"      "}
      <span className="text-gray-300">exporter: </span>
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">OpenTelemetryExporter({"{"}</span>
      <br />
      {"        "}
      <span className="text-gray-300">endpoint: process.env.OPENTELEMETRY_ENDPOINT,</span>
      <br />
      {"      "}
      <span className="text-gray-300">{"}"}),</span>
      <br />
      {"    "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      {"  "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      <span className="text-gray-300">{"}"});</span>
    </>
  ),
  newRelic: (
    <>
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ VoltAgent }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"@voltagent/core"</span>
      <br />
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ OpenTelemetryExporter }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"opentelemetry-js"</span>
      <br />
      <br />
      <span className="text-purple-400">export const</span>{" "}
      <span className="text-gray-300">volt</span> <span className="text-gray-500">=</span>{" "}
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">VoltAgent({"{"}</span>
      <br />
      {"  "}
      <span className="text-gray-300">telemetry: {"{"}</span>
      <br />
      {"    "}
      <span className="text-gray-300">serviceName: </span>
      <span className="text-main-emerald">"ai"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">enabled: </span>
      <span className="text-purple-400">true</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">export: {"{"}</span>
      <br />
      {"      "}
      <span className="text-gray-300">type: </span>
      <span className="text-main-emerald">"opentelemetry"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"      "}
      <span className="text-gray-300">exporter: </span>
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">OpenTelemetryExporter({"{"}</span>
      <br />
      {"        "}
      <span className="text-gray-300">endpoint: process.env.OPENTELEMETRY_ENDPOINT,</span>
      <br />
      {"      "}
      <span className="text-gray-300">{"}"}),</span>
      <br />
      {"    "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      {"  "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      <span className="text-gray-300">{"}"});</span>
    </>
  ),
  traceLoop: (
    <>
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ VoltAgent }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"@voltagent/core"</span>
      <br />
      <span className="text-blue-400">import</span>{" "}
      <span className="text-gray-300">{"{ OpenTelemetryExporter }"}</span>{" "}
      <span className="text-blue-400">from</span>{" "}
      <span className="text-main-emerald">"opentelemetry-js"</span>
      <br />
      <br />
      <span className="text-purple-400">export const</span>{" "}
      <span className="text-gray-300">volt</span> <span className="text-gray-500">=</span>{" "}
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">VoltAgent({"{"}</span>
      <br />
      {"  "}
      <span className="text-gray-300">telemetry: {"{"}</span>
      <br />
      {"    "}
      <span className="text-gray-300">serviceName: </span>
      <span className="text-main-emerald">"ai"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">enabled: </span>
      <span className="text-purple-400">true</span>
      <span className="text-gray-300">,</span>
      <br />
      {"    "}
      <span className="text-gray-300">export: {"{"}</span>
      <br />
      {"      "}
      <span className="text-gray-300">type: </span>
      <span className="text-main-emerald">"opentelemetry"</span>
      <span className="text-gray-300">,</span>
      <br />
      {"      "}
      <span className="text-gray-300">exporter: </span>
      <span className="text-purple-400">new</span>{" "}
      <span className="text-gray-300">OpenTelemetryExporter({"{"}</span>
      <br />
      {"        "}
      <span className="text-gray-300">endpoint: process.env.OPENTELEMETRY_ENDPOINT,</span>
      <br />
      {"      "}
      <span className="text-gray-300">{"}"}),</span>
      <br />
      {"    "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      {"  "}
      <span className="text-gray-300">{"}"},</span>
      <br />
      <span className="text-gray-300">{"}"});</span>
    </>
  ),
};

const tabs: TabData[] = [
  {
    id: "langsmith",
    name: "Langsmith",
    description: "LLM-specific observability platform",
    isConnected: false,
    icon: (
      <LangSmithLogo className="landing-md:w-10 landing-md:h-10 landing-xs:w-8 landing-xs:h-8" />
    ),
    codeJSX: codeExamples.langsmith,
  },
  {
    id: "langfuse",
    name: "Langfuse",
    description: "LLM-specific observability platform",
    isConnected: false,
    icon: <LangfuseLogo className="landing-md:w-8 landing-md:h-10 landing-xs:w-6 landing-xs:h-8" />,
    codeJSX: codeExamples.langfuse,
  },

  {
    id: "braintrust",
    name: "Braintrust",
    description: "Error tracking and performance monitoring",
    isConnected: false,
    icon: (
      <BraintrustLogo2 className="landing-md:w-20 landing-md:h-10 landing-xs:w-16 landing-xs:h-8" />
    ),
    codeJSX: codeExamples.braintrust,
  },
  {
    id: "dash0",
    name: "Dash0",
    description: "Cloud monitoring and analytics platform",
    isConnected: false,
    icon: <Dash0Logo className="landing-md:w-16 landing-md:h-10 landing-xs:w-12 landing-xs:h-8" />,
    codeJSX: codeExamples.dash0,
  },
  {
    id: "signoz",
    name: "Signoz",
    description: "Observability framework for cloud-native software",
    isConnected: false,
    icon: (
      <SignozLogo className="landing-md:w-6 landing-md:h-6 landing-md:mt-1.5 landing-xs:w-6 landing-xs:h-6 landing-xs:mt-1" />
    ),
    codeJSX: codeExamples.signoz,
  },
  {
    id: "langwatch",
    name: "Langwatch",
    description: "Observability framework for cloud-native software",
    isConnected: false,
    icon: (
      <LangWatchLogo className="landing-md:w-20 landing-md:h-10 landing-xs:w-16 landing-xs:h-8" />
    ),
    codeJSX: codeExamples.langwatch,
  },

  {
    id: "newRelic",
    name: "New Relic",
    description: "Observability framework for cloud-native software",
    isConnected: false,
    icon: (
      <NewRelicLogo className="landing-md:w-20 landing-md:h-10 landing-xs:w-16 landing-xs:h-8" />
    ),
    codeJSX: codeExamples.signoz,
  },
  {
    id: "honeyhive",
    name: "Honeyhive",
    description: "Observability framework for cloud-native software",
    isConnected: false,
    icon: (
      <img
        src={HoneyhiveLogo}
        alt="Honeyhive Logo"
        className="landing-md:h-[20px] landing-md:mt-2.5 landing-xs:h-[16px] landing-xs:mt-1.5 grayscale"
      />
    ),
    codeJSX: codeExamples.signoz,
  },
  {
    id: "traceLoop",
    name: "TraceLoop",
    description: "Observability framework for cloud-native software",
    isConnected: false,
    icon: (
      <img
        src={TraceLogo}
        alt="TraceLoop Logo"
        className="landing-md:h-[14px] landing-md:mt-3 landing-xs:h-[12px] landing-xs:mt-1.5 grayscale"
      />
    ),
    codeJSX: codeExamples.signoz,
  },
];

const TabItem = ({
  tab,
  isActive,
  onClick,
}: {
  tab: TabData;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      className={`flex flex-col items-center px-3 pt-2 cursor-pointer transition-all duration-300 ease-in-out  min-w-[80px] ${
        isActive ? "  " : "border-transparent text-gray-300 hover:text-gray-200 "
      }`}
      onClick={onClick}
    >
      <div className="relative group">
        <div className="flex flex-col items-center">
          <div className=" ">
            <div
              className={` ${
                isActive ? "scale-105 transform transition-transform duration-300" : ""
              }`}
            >
              {React.cloneElement(tab.icon as React.ReactElement)}
            </div>
          </div>
          {isActive && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#00d992] animate-pulse rounded-full shadow-[0_0_8px_rgba(0,217,146,0.6)]" />
          )}
          {/* 
          <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap">{tab.name}</span> */}
        </div>
      </div>
    </div>
  );
};

// Animation variants for code content
const codeBlockVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

const CodeBlock = ({ code, isActive }: { code: React.ReactNode; isActive: boolean }) => {
  if (!isActive) return null;

  return (
    <div className="mt-2 sm:mt-3">
      <div className="relative max-w-4xl overflow-hidden border border-[#1e2730] hover:border-[#00d992] transition-all duration-300 rounded-lg">
        {/* Green glowing bar at top */}
        <motion.div
          className="absolute top-0 left-0 w-full h-[3px] rounded-t-lg landing-xs:hidden landing-md:block"
          style={{
            background:
              "linear-gradient(45deg, rgb(0, 217, 146), rgb(0, 217, 146), rgb(0, 217, 146), rgb(0, 217, 146)) 0% 0% / 300%",
          }}
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
        />

        {/* Code content with line numbers - matching style from code-example.tsx */}
        <pre className="text-left bg-white/5 overflow-x-auto rounded-lg p-0 text-[10px] sm:text-sm font-mono m-0 h-[250px] sm:h-[347px]">
          <div className="flex">
            <div className="py-7 px-2 text-right text-gray-500 leading-[1.4] select-none border-r border-gray-700 min-w-[30px] landing-xs:text-[9px] landing-md:text-xs">
              {Array.from({ length: 18 }, (_, i) => (
                <div key={`line-${i + 1}`}>{i + 1}</div>
              ))}
            </div>
            <div className="py-7 px-3 block landing-xs:text-[9px] landing-md:text-xs w-full relative">
              <motion.div
                className="absolute inset-0 bg-[#00d992]/5 rounded-r"
                layoutId="codeHighlight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
              <AnimatePresence mode="wait">
                <motion.code
                  key={`code-${isActive}`}
                  id="code-content"
                  className="block relative z-10"
                  variants={codeBlockVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {code}
                </motion.code>
              </AnimatePresence>
            </div>
          </div>
        </pre>
      </div>
    </div>
  );
};

export default function Observability() {
  const [activeTab, setActiveTab] = useState<ObservabilityTab>("langfuse");

  return (
    <div
      className="landing-md:p-4 landing-xs:p-2  w-full  overflow-hidden"
      style={{
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        backgroundColor: "rgba(58, 66, 89, 0.3)",
      }}
    >
      <div className="w-full overflow-hidden">
        {/* Tabs */}
        <div className="flex flex-wrap justify-center  overflow-x-auto sm:overflow-visible">
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </div>
      {/* Content */}
      <div className=" px-0">
        <div className="relative">
          {tabs.map((tab) => (
            <CodeBlock key={tab.id} code={tab.codeJSX} isActive={activeTab === tab.id} />
          ))}
        </div>
      </div>
    </div>
  );
}
