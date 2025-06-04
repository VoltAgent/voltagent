import React, { useState } from "react";
import {
  ClockIcon,
  CpuChipIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

type ModelResponse = {
  response: string;
  latency: number;
  tokens: number;
  retrievedChunks?: string[];
};

const sampleQueries = [
  "What are the key features of our new product?",
  "How do I implement authentication in the framework?",
  "What's the pricing structure for enterprise clients?",
  "Can you explain our refund policy?",
];

const mockResponses: Record<
  string,
  { rag: ModelResponse; finetuned: ModelResponse }
> = {
  "What are the key features of our new product?": {
    rag: {
      response:
        "Based on the retrieved documentation, the key features include: 1) Real-time data processing, 2) Advanced security measures, 3) Scalable architecture, and 4) API integration capabilities.",
      latency: 2.3,
      tokens: 145,
      retrievedChunks: [
        "Product features section 1.2: Real-time processing...",
        "Security documentation 3.1: Advanced measures...",
      ],
    },
    finetuned: {
      response:
        "Our product's key features include real-time processing capabilities, enterprise-grade security, horizontal scaling, and extensive API support for third-party integrations.",
      latency: 0.8,
      tokens: 112,
    },
  },
  "How do I implement authentication in the framework?": {
    rag: {
      response:
        "According to our documentation, you can implement authentication by: 1) Installing the auth package, 2) Configuring providers, 3) Setting up middleware. Here's the relevant code snippet...",
      latency: 2.1,
      tokens: 178,
      retrievedChunks: [
        "Authentication guide: Installation steps...",
        "Middleware configuration section...",
      ],
    },
    finetuned: {
      response:
        "To implement authentication, install @voltagent/auth, configure your preferred provider in config.ts, and add the auth middleware to your routes. Full implementation details in docs.",
      latency: 0.9,
      tokens: 134,
    },
  },
  "What's the pricing structure for enterprise clients?": {
    rag: {
      response:
        "Based on our current pricing documentation: Enterprise pricing starts at $2000/month, includes unlimited API calls, dedicated support, and custom integrations. Volume discounts available.",
      latency: 1.9,
      tokens: 156,
      retrievedChunks: [
        "Enterprise pricing section: Base pricing...",
        "Volume discounts documentation...",
      ],
    },
    finetuned: {
      response:
        "Enterprise plans start at $2000 monthly with unlimited API usage, 24/7 dedicated support, and custom integration options. Contact sales for volume pricing.",
      latency: 0.7,
      tokens: 98,
    },
  },
  "Can you explain our refund policy?": {
    rag: {
      response:
        "According to our policy documents: We offer full refunds within 30 days of purchase. Enterprise clients have a 60-day evaluation period. Refund requests require submission through the customer portal.",
      latency: 2.0,
      tokens: 167,
      retrievedChunks: [
        "Refund policy section 2.1: Timeframes...",
        "Enterprise terms section: Evaluation period...",
      ],
    },
    finetuned: {
      response:
        "We provide 30-day full refunds for standard purchases and 60-day evaluation periods for enterprise clients. Submit refund requests through your customer portal.",
      latency: 0.8,
      tokens: 89,
    },
  },
};

export default function ModelPerformanceComparator(): JSX.Element {
  const [selectedQuery, setSelectedQuery] = useState<string>(sampleQueries[0]);
  const [customQuery, setCustomQuery] = useState<string>("");

  const currentQuery = customQuery || selectedQuery;
  const responses = mockResponses[currentQuery];

  return (
    <div className="border-2 border-solid border-emerald-500 rounded-lg p-5 mb-6 bg-gray-800">
      <h3 className="text-xl font-bold text-white mb-4">
        Compare Model Responses
      </h3>

      {/* Query Input */}
      <div className="mb-6">
        <input
          type="text"
          value={customQuery}
          onChange={(e) => setCustomQuery(e.target.value)}
          placeholder="Enter your test query..."
          className="w-full p-3 bg-gray-700 border border-gray-600 text-white rounded-md 
                   focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
        />
        <div className="mt-2 text-gray-400 text-sm">Or try these examples:</div>
        <div className="flex flex-wrap gap-2 mt-2">
          {sampleQueries.map((query) => (
            <button
              key={query}
              type="button"
              onClick={() => {
                setSelectedQuery(query);
                setCustomQuery("");
              }}
              className={`px-3 py-1 rounded-md text-sm transition-all duration-200
                ${
                  query === selectedQuery && !customQuery
                    ? "bg-emerald-700 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
            >
              {query}
            </button>
          ))}
        </div>
      </div>

      {/* Response Comparison */}
      {responses && (
        <div className="grid md:grid-cols-2 gap-3">
          {/* RAG Response */}
          <div className="bg-gray-700/60 p-3 rounded-lg border border-gray-600">
            <h4 className="text-base font-semibold text-white mb-2">
              RAG Response
            </h4>
            <div className="text-sm text-gray-300 mb-3">
              {responses.rag.response}
            </div>

            {/* Retrieved Chunks */}
            <div className="mb-3">
              <h5 className="text-xs font-medium text-white mb-1">
                Retrieved Chunks:
              </h5>
              <div className="space-y-1">
                {responses.rag.retrievedChunks?.map((chunk) => (
                  <div
                    key={`chunk-${chunk.substring(0, 20)}`}
                    className="text-xs bg-gray-800 p-1.5 rounded border border-gray-600"
                  >
                    {chunk}
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <div className="flex items-center">
                <ClockIcon className="h-3 w-3 mr-1" />
                {responses.rag.latency}s
              </div>
              <div className="flex items-center">
                <CpuChipIcon className="h-3 w-3 mr-1" />
                {responses.rag.tokens} tokens
              </div>
            </div>
          </div>

          {/* Fine-tuned Response */}
          <div className="bg-emerald-900/30 p-3 rounded-lg border border-emerald-500/50">
            <h4 className="text-base font-semibold text-emerald-400 mb-2">
              Fine-tuned Response
            </h4>
            <div className="text-sm text-emerald-100 mb-3">
              {responses.finetuned.response}
            </div>

            {/* Direct Response Note */}
            <div className="mb-3">
              <div className="flex items-center text-xs text-emerald-300">
                <DocumentTextIcon className="h-3 w-3 mr-1" />
                Direct response (no retrieval needed)
              </div>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-3 text-xs text-emerald-300">
              <div className="flex items-center">
                <ClockIcon className="h-3 w-3 mr-1" />
                {responses.finetuned.latency}s
              </div>
              <div className="flex items-center">
                <CpuChipIcon className="h-3 w-3 mr-1" />
                {responses.finetuned.tokens} tokens
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Insights */}
      {responses && (
        <div className="mt-4 bg-gray-700/30 p-3 rounded-lg">
          <h4 className="text-base font-semibold text-white mb-2">
            Performance Insights
          </h4>
          <div className="space-y-1 text-xs text-gray-300">
            <p>
              • Latency Difference:{" "}
              <span className="text-emerald-400">
                {(responses.rag.latency - responses.finetuned.latency).toFixed(
                  1,
                )}
                s faster
              </span>{" "}
              with fine-tuning
            </p>
            <p>
              • Token Usage:{" "}
              <span className="text-emerald-400">
                {(
                  ((responses.rag.tokens - responses.finetuned.tokens) /
                    responses.rag.tokens) *
                  100
                ).toFixed(0)}
                % fewer
              </span>{" "}
              tokens with fine-tuning
            </p>
            <p>
              • RAG provides source context but requires additional processing
              time
            </p>
            <p>
              • Fine-tuned model gives direct answers but needs retraining for
              new information
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
