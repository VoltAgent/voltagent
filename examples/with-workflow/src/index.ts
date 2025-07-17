import { openai } from "@ai-sdk/openai";
import {
  Agent,
  VoltAgent,
  createWorkflowChain,
  andThen,
  andAgent,
  andWhen,
  andAll,
  andRace,
  andTap,
} from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { z } from "zod";

// Define agents for different tasks
const contentAgent = new Agent({
  name: "ContentAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: "You are a content creation expert. Generate engaging and accurate content.",
});

const analysisAgent = new Agent({
  name: "AnalysisAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: "You are a data analyst. Provide insights and structured analysis.",
});

const translationAgent = new Agent({
  name: "TranslationAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: "You are a professional translator. Preserve meaning and tone.",
});

// 1. SIMPLE WORKFLOW: Email Response Generator
// Shows basic chaining and single AI agent usage
const emailResponseWorkflow = createWorkflowChain({
  id: "email-response",
  name: "Email Response Generator",
  purpose: "Analyze incoming email and generate appropriate response",
  input: z.object({
    email: z.string(),
    senderName: z.string(),
  }),
  result: z.object({
    response: z.string(),
    category: z.string(),
    priority: z.string(),
  }),
})
  // Step 1: Extract email metadata
  .andThen({
    id: "extract-metadata",
    execute: async ({ data }) => {
      const wordCount = data.email.split(/\s+/).length;
      const hasQuestion = data.email.includes("?");
      const hasUrgentKeywords = /urgent|asap|immediately/i.test(data.email);

      return {
        ...data,
        wordCount,
        hasQuestion,
        isUrgent: hasUrgentKeywords,
      };
    },
  })
  // Step 2: Use AI to categorize and respond
  .andAgent(
    async ({ data }) => `
      Analyze this email and provide:
      1. A professional response
      2. Category (support, sales, inquiry, complaint)
      3. Priority level (low, medium, high)
      
      Email from ${data.senderName}: "${data.email}"
      ${data.isUrgent ? "Note: This email contains urgent keywords." : ""}
    `,
    contentAgent,
    {
      schema: z.object({
        response: z.string(),
        category: z.string(),
        priority: z.string(),
      }),
    },
  );

// 2. INTERMEDIATE WORKFLOW: Content Processing Pipeline
// Shows conditional logic, getStepData usage, and parallel processing
const contentProcessingWorkflow = createWorkflowChain({
  id: "content-processing",
  name: "Content Processing Pipeline",
  purpose: "Generate content, validate it, and optionally enhance it with translations",
  input: z.object({
    topic: z.string(),
    requireTranslation: z.boolean(),
  }),
  result: z.object({
    originalContent: z.string(),
    wordCount: z.number(),
    translations: z.record(z.string()).optional(),
    processingTime: z.number(),
  }),
})
  // Step 1: Generate content
  .andAgent(
    async ({ data }) =>
      `Write a 2-paragraph article about "${data.topic}". Make it engaging and informative.`,
    contentAgent,
    {
      schema: z.object({
        content: z.string(),
        title: z.string(),
      }),
    },
  )
  // Step 2: Analyze content
  .andThen({
    id: "analyze-content",
    execute: async ({ data }) => {
      const wordCount = data.content.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200); // Average reading speed

      return {
        ...data,
        wordCount,
        readingTime,
        timestamp: Date.now(),
      };
    },
  })
  // Step 3: Conditional translation
  .andWhen({
    id: "translate-if-needed",
    condition: async ({ data, state }) => {
      // Access original input to check if translation was requested
      const originalInput = state.input as { requireTranslation: boolean };
      return originalInput.requireTranslation && data.wordCount > 50;
    },
    step: andAll({
      id: "translate-content",
      steps: [
        andAgent(
          async ({ data }) => `Translate this to Spanish: "${data.content}"`,
          translationAgent,
          {
            schema: z.object({
              spanish: z.string(),
            }),
          },
        ),
        andAgent(
          async ({ data }) => `Translate this to French: "${data.content}"`,
          translationAgent,
          {
            schema: z.object({
              french: z.string(),
            }),
          },
        ),
      ],
    }),
  })
  // Step 4: Format final output using getStepData
  .andThen({
    id: "format-output",
    execute: async ({ data, getStepData }) => {
      // Access data from the first content generation step
      const contentGeneration = getStepData("generate-content");
      const analysisStep = getStepData("analyze-content");
      const translationsStep = getStepData("translate-content");

      // Build translations object if translations were performed
      let translations: Record<string, string> | undefined;
      if (translationsStep?.output && Array.isArray(translationsStep.output)) {
        translations = {};
        const [spanish, french] = translationsStep.output;
        if (spanish && "spanish" in spanish) {
          translations.es = spanish.spanish;
        }
        if (french && "french" in french) {
          translations.fr = french.french;
        }
      }

      return {
        originalContent:
          contentGeneration?.output?.content || ("content" in data ? data.content : ""),
        wordCount: "wordCount" in data ? data.wordCount : 0,
        translations,
        processingTime: Date.now() - (analysisStep?.output?.timestamp || Date.now()),
      };
    },
  });

// 3. ADVANCED WORKFLOW: Customer Support Automation
// Uses ALL workflow features: andThen, andAgent, andWhen, andAll, andRace, andTap, getStepData
const supportAutomationWorkflow = createWorkflowChain({
  id: "support-automation",
  name: "Advanced Support Automation",
  purpose: "Process support requests with intelligent routing and response generation",
  input: z.object({
    customerName: z.string(),
    issue: z.string(),
    accountType: z.enum(["free", "premium", "enterprise"]),
  }),
  result: z.object({
    response: z.string(),
    category: z.string(),
    processingPath: z.string(),
    responseTime: z.number(),
    escalated: z.boolean(),
  }),
})
  // Step 1: Log the incoming request
  .andTap({
    id: "log-request",
    execute: async ({ data, state }) => {
      console.log(`[${new Date().toISOString()}] Support request from ${data.customerName}`);
      console.log(`Account type: ${data.accountType}, Session: ${state.conversationId || "N/A"}`);
    },
  })
  // Step 2: Analyze the issue
  .andAgent(
    async ({ data }) => `
      Analyze this support issue and categorize it:
      Customer: ${data.customerName} (${data.accountType} account)
      Issue: "${data.issue}"
      
      Provide:
      1. Category (technical, billing, feature-request, complaint)
      2. Severity (low, medium, high, critical)
      3. Requires human intervention (yes/no)
    `,
    analysisAgent,
    {
      schema: z.object({
        category: z.string(),
        severity: z.string(),
        requiresHuman: z.boolean(),
      }),
    },
  )
  // Step 3: Check if escalation is needed
  .andWhen({
    id: "check-escalation",
    condition: async ({ data, getStepData }) => {
      // Access original input for accountType
      const originalInput = getStepData("log-request");
      const accountType = originalInput?.input?.accountType || "free";
      return data.requiresHuman || data.severity === "critical" || accountType === "enterprise";
    },
    step: andThen({
      id: "escalate",
      execute: async ({ data, getStepData }) => ({
        ...data,
        escalated: true,
        escalationReason: `${data.severity} severity ${data.category} issue for ${getStepData("log-request")?.input?.accountType || "unknown"} customer`,
      }),
    }),
  })
  // Step 4: Generate response based on priority
  .andThen({
    id: "generate-response",
    execute: async ({ data, getStepData }) => {
      const logStep = getStepData("log-request");
      const customerName = logStep?.input?.customerName || "Valued Customer";
      const originalIssue = logStep?.input?.issue || "";

      // Use template for low priority, AI for high priority
      const isEscalated = "escalated" in data && data.escalated;
      if (data.severity === "critical" || isEscalated) {
        // Generate personalized response for critical issues
        const { object } = await contentAgent.generateObject(
          `Generate a personalized, empathetic response for this critical support request:
           Category: ${data.category}
           Severity: ${data.severity}
           Issue: "${originalIssue}"
           Customer: ${customerName}
           
           Be professional, acknowledge the urgency, and provide concrete next steps.`,
          z.object({
            response: z.string(),
          }),
        );

        return {
          ...data,
          response: object.response,
          responseType: "personalized",
          responseTime: 200,
        };
      }
      // Use template response for standard issues
      const templates: Record<string, string> = {
        technical: "We've identified a technical issue and our team is investigating.",
        billing: "We'll review your billing concern and respond within 24 hours.",
        "feature-request": "Thank you for your suggestion. We've added it to our roadmap.",
        complaint: "We apologize for the inconvenience and will address this immediately.",
      };

      return {
        ...data,
        response: `Dear ${customerName}, ${templates[data.category] || templates.complaint}`,
        responseType: "template",
        responseTime: 50,
      };
    },
  })
  // Step 5: Finalize the response
  .andThen({
    id: "finalize",
    execute: async ({ data, getStepData }) => {
      // Get data from various steps to compile final result
      const analysisData = getStepData("analyze-issue");
      const escalationData = getStepData("escalate");

      return {
        response: data.response,
        category: analysisData?.output?.category || "unknown",
        processingPath: data.responseType,
        responseTime: data.responseTime,
        escalated: escalationData !== undefined,
      };
    },
  })
  // Step 6: Log completion
  .andTap({
    id: "log-completion",
    execute: async ({ data }) => {
      console.log(`[${new Date().toISOString()}] Response sent`);
      console.log(
        `Path: ${data.processingPath}, Time: ${data.responseTime}ms, Escalated: ${data.escalated}`,
      );
    },
  });

// Register all workflows with VoltAgent
new VoltAgent({
  agents: {
    contentAgent,
    analysisAgent,
    translationAgent,
  },
  workflows: {
    emailResponseWorkflow,
    contentProcessingWorkflow,
    supportAutomationWorkflow,
  },
});
