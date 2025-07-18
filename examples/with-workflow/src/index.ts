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

const simpleAgent = new Agent({
  name: "SimpleAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: "You are a helpful assistant that analyzes patterns and provides insights.",
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
// Signal-aware sleep function that can be interrupted
const sleep = (ms: number, signal?: AbortSignal): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already aborted
    if (signal?.aborted) {
      reject(new Error("WORKFLOW_SUSPENDED"));
      return;
    }

    const timeoutId = setTimeout(resolve, ms);

    // Listen for abort signal
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeoutId);
        reject(new Error("WORKFLOW_SUSPENDED"));
      },
      { once: true },
    );
  });
};

// 10-step incrementing workflow for testing suspend/resume
const incrementingWorkflow = createWorkflowChain({
  id: "incrementing-workflow",
  name: "Incrementing Number Workflow",
  purpose:
    "A 10-step workflow where each step increments a number and waits 10 seconds. Perfect for testing suspend/resume functionality.",
  input: z.object({
    startNumber: z.number().default(0),
  }),
  result: z.object({
    finalNumber: z.number(),
    history: z.array(z.number()),
    summary: z.string(),
    totalDuration: z.string(),
  }),
})
  .andThen({
    id: "step-1",
    name: "Step 1 - Initialize",
    execute: async ({ data, state }) => {
      const number = data.startNumber + 1;
      console.log(`🔢 Step 1: Starting with ${data.startNumber}, incrementing to ${number}`);
      await sleep(1000, state.signal); // 1 second with signal support
      console.log(`✅ Step 1 complete: number = ${number}`);
      return { number, history: [number] };
    },
  })
  .andThen({
    id: "step-2",
    name: "Step 2 - Increment to 2",
    execute: async ({ data, state }) => {
      const newNumber = data.number + 1;
      console.log(`🔢 Step 2: Incrementing from ${data.number} to ${newNumber}`);
      await sleep(1000, state.signal); // 1 second with signal support
      console.log(`✅ Step 2 complete: number = ${newNumber}`);
      return { number: newNumber, history: [...data.history, newNumber] };
    },
  })
  .andThen({
    id: "step-3",
    name: "Step 3 - Increment to 3",
    execute: async ({ data, state }) => {
      const newNumber = data.number + 1;
      console.log(`🔢 Step 3: Incrementing from ${data.number} to ${newNumber}`);
      await sleep(1000, state.signal); // 1 second with signal support
      console.log(`✅ Step 3 complete: number = ${newNumber}`);
      return { number: newNumber, history: [...data.history, newNumber] };
    },
  })
  // Test andAll - run multiple operations in parallel
  .andAll({
    id: "parallel-processing",
    name: "Parallel Processing - Multiple Operations",
    steps: [
      {
        id: "parallel-1",
        name: "Parallel Path 1",
        purpose: "Process a number in parallel",
        type: "func",
        execute: async ({ data, state }) => {
          console.log(`🔀 Parallel 1: Processing number ${data.number}`);
          await sleep(1000, state.signal); // 1 second
          const result = data.number + 10;
          console.log(`✅ Parallel 1 complete: added 10, result = ${result}`);
          return { path1Result: result };
        },
      },
      {
        id: "parallel-2",
        name: "Parallel Path 2",
        purpose: "Multiply a number in parallel",
        type: "func",
        execute: async ({ data, state }) => {
          console.log(`🔀 Parallel 2: Processing number ${data.number}`);
          await sleep(1500, state.signal); // 1.5 seconds
          const result = data.number * 2;
          console.log(`✅ Parallel 2 complete: multiplied by 2, result = ${result}`);
          return { path2Result: result };
        },
      },
    ],
  })
  .andThen({
    id: "step-4",
    name: "Step 4 - Continue after parallel",
    execute: async ({ state }) => {
      // Just continue with fixed number
      const newNumber = 4;
      console.log(`🔢 Step 4: Setting number to ${newNumber}`);
      await sleep(1000, state.signal);
      console.log(`✅ Step 4 complete: number = ${newNumber}`);
      return { number: newNumber, history: [1, 2, 3, newNumber] };
    },
  })
  .andThen({
    id: "step-5",
    name: "Step 5 - Increment to 5",
    execute: async ({ data, state }) => {
      const newNumber = data.number + 1;
      console.log(`🔢 Step 5: Incrementing from ${data.number} to ${newNumber}`);
      await sleep(1000, state.signal);
      console.log(`✅ Step 5 complete: number = ${newNumber}`);
      return { number: newNumber, history: [...data.history, newNumber] };
    },
  })
  // Test andRace - first one to complete wins
  .andRace({
    id: "race-processing",
    name: "Race Processing - Fastest Wins",
    steps: [
      {
        id: "race-1",
        name: "Race Path 1 - Quick",
        type: "func",
        purpose: "Quick processing path that should win",
        execute: async ({ data, state }) => {
          console.log(`🏃 Race 1: Quick processing of ${data.number}`);
          await sleep(500, state.signal); // 0.5 seconds - this will win
          const result = data.number + 5;
          console.log(`🏁 Race 1 finished: added 5, result = ${result}`);
          return { raceResult: result, winner: "path1" };
        },
      },
      {
        id: "race-2",
        name: "Race Path 2 - Slow",
        type: "func",
        purpose: "Slower processing path that should lose",
        execute: async ({ data, state }) => {
          console.log(`🏃 Race 2: Slow processing of ${data.number}`);
          await sleep(2000, state.signal); // 2 seconds
          const result = data.number + 15;
          console.log(`🏁 Race 2 finished: added 15, result = ${result}`);
          return { raceResult: result, winner: "path2" };
        },
      },
    ],
  })
  .andThen({
    id: "step-6",
    name: "Step 6 - Continue after race",
    execute: async ({ state }) => {
      // Continue with fixed number
      const newNumber = 6;
      console.log(`🔢 Step 6: Setting number to ${newNumber}`);
      await sleep(1000, state.signal);
      console.log(`✅ Step 6 complete: number = ${newNumber}`);
      return { number: newNumber, history: [1, 2, 3, 4, 5, newNumber] };
    },
  })
  .andThen({
    id: "step-7",
    name: "Step 7 - Increment to 7",
    execute: async ({ data, state }) => {
      const newNumber = data.number + 1;
      console.log(`🔢 Step 7: Incrementing from ${data.number} to ${newNumber}`);
      await sleep(1000, state.signal);
      console.log(`✅ Step 7 complete: number = ${newNumber}`);
      return { number: newNumber, history: [...data.history, newNumber] };
    },
  })
  // Test andAgent - use an agent to process the number
  .andAgent(
    async ({ data }) => `
      You have a number: ${data.number}
      And a history: ${data.history.join(", ")}
      
      Please analyze this sequence and suggest the next logical number in the sequence.
      Return your suggestion as a structured response.
    `,
    simpleAgent,
    {
      schema: z.object({
        suggestion: z.number(),
        reasoning: z.string(),
      }),
    },
  )
  .andThen({
    id: "step-8",
    name: "Step 8 - Use agent suggestion",
    execute: async ({ data, state }) => {
      const newNumber = data.suggestion || 8;
      console.log(`🔢 Step 8: Using agent suggestion ${newNumber} (${data.reasoning})`);
      await sleep(1000, state.signal);
      console.log(`✅ Step 8 complete: number = ${newNumber}`);
      return { number: newNumber, history: [1, 2, 3, 4, 5, 6, 7, newNumber] };
    },
  })
  .andThen({
    id: "step-9",
    name: "Step 9 - Increment to 9",
    execute: async ({ data, state }) => {
      const newNumber = data.number + 1;
      console.log(`🔢 Step 9: Incrementing from ${data.number} to ${newNumber}`);
      await sleep(1000, state.signal);
      console.log(`✅ Step 9 complete: number = ${newNumber}`);
      return { number: newNumber, history: [...data.history, newNumber] };
    },
  })
  .andThen({
    id: "step-10",
    name: "Step 10 - Final Increment",
    execute: async ({ data, state }) => {
      const newNumber = data.number + 1;
      console.log(`🔢 Step 10: Final increment from ${data.number} to ${newNumber}`);
      await sleep(1000, state.signal);
      console.log(`✅ Step 10 complete: Final number = ${newNumber}`);
      console.log(`📊 Full history: ${[...data.history, newNumber].join(" → ")}`);

      const summary = `
🎯 Workflow Complete!
- Final number: ${newNumber}
- Total steps: 10
- History: ${[...data.history, newNumber].join(" → ")}

🔄 Special Operations:
- Parallel processing (andAll): Processed 2 paths in parallel
- Race processing (andRace): Fastest path won
- Agent analysis: AI suggested next number

📊 Performance:
- Total duration: ~15 seconds (with all async operations)
- Suspend/Resume can be tested at any step
      `.trim();

      console.log(summary);

      return {
        finalNumber: newNumber,
        history: [...data.history, newNumber],
        summary,
        totalDuration: "~15 seconds",
      };
    },
  });

const testWorkflow = createWorkflowChain({
  id: "suspend-resume-type-test",
  name: "Suspend/Resume Type Test",
  purpose: "Test that TypeScript types work correctly with suspend/resume",
  input: z.object({
    initialValue: z.number(),
    approved: z.boolean().optional(),
  }),
  result: z.object({
    count: z.number(),
    message: z.string(),
  }),
  // Define what data can be passed when suspending
  suspendSchema: z.object({
    currentValue: z.number(),
    timestamp: z.string(),
    reason: z.string().optional(),
  }),
  // Define what data must be passed when resuming
  resumeSchema: z.object({
    initialValue: z.number(),
    approved: z.boolean(),
  }),
})
  .andThen({
    id: "step-1-validation",
    execute: async ({ data, suspend }) => {
      console.log("Step 1: Validating input", data.initialValue);

      // Suspend if not approved
      if (!data.approved) {
        console.log("Suspending workflow for approval...");
        // Now TypeScript enforces the suspend schema
        await suspend("User approval needed", {
          currentValue: data.initialValue,
          timestamp: new Date().toISOString(),
          reason: "User approval required for processing",
        });
        // This line will never execute due to immediate suspension
        throw new Error("Should not reach here");
      }

      // Continue if approved
      console.log("Approved! Continuing with processing...");
      return {
        validatedValue: data.initialValue,
        validationTime: new Date().toISOString(),
      };
    },
  })
  .andThen({
    id: "step-2-processing",
    execute: async ({ data }) => {
      console.log("Step 2: Processing validated value", data.validatedValue);
      return {
        count: data.validatedValue + 10,
        message: `Processed value: ${data.validatedValue + 10}`,
      };
    },
  });

// Example: Approval workflow
const approvalWorkflow = createWorkflowChain({
  id: "approval-workflow",
  name: "Approval Workflow",
  purpose: "Demonstrates suspend/resume with approval logic",
  input: z.object({
    amount: z.number(),
    approved: z.boolean().optional(),
  }),
  result: z.object({
    status: z.string(),
    processedAmount: z.number(),
  }),
  // Suspend data includes amount and reason
  suspendSchema: z.object({
    amount: z.number(),
    reason: z.string(),
    requiredApproverLevel: z.enum(["manager", "director", "vp"]),
  }),
  // Resume must include approval status
  resumeSchema: z.object({
    amount: z.number(),
    approved: z.boolean(),
    approverName: z.string().optional(),
    approvalComments: z.string().optional(),
  }),
})
  .andThen({
    id: "check-approval",
    execute: async ({ data, suspend }) => {
      console.log(`Checking approval for amount: $${data.amount}`);

      // Amounts over 1000 need approval
      if (data.amount > 1000 && !data.approved) {
        console.log("Large amount detected - suspending for approval");
        // TypeScript enforces the suspend schema
        const approverLevel =
          data.amount > 10000 ? "vp" : data.amount > 5000 ? "director" : "manager";
        await suspend("Manager approval required", {
          amount: data.amount,
          reason: "Amount exceeds auto-approval limit",
          requiredApproverLevel: approverLevel,
        });
      }

      return {
        approvalStatus: data.approved ? "approved" : "auto-approved",
        amount: data.amount,
      };
    },
  })
  .andThen({
    id: "process-transaction",
    execute: async ({ data }) => {
      console.log(`Processing transaction with status: ${data.approvalStatus}`);

      return {
        status: `Transaction ${data.approvalStatus} and processed`,
        processedAmount: data.amount,
      };
    },
  });

const orderWorkflow = createWorkflowChain({
  id: "order-processor",
  name: "Order Processing Workflow",
  input: z.object({
    orderId: z.string(),
    amount: z.number(),
  }),
  result: z.object({
    status: z.string(),
    approvedBy: z.string().optional(),
  }),
})
  .andThen({
    id: "validate-order",
    execute: async ({ data }) => {
      console.log(`Validating order ${data.orderId} for $${data.amount}`);
      return {
        ...data,
        validated: true,
        approved: data.amount <= 1000,
        approvedBy: data.amount <= 1000 ? "auto" : undefined,
      };
    },
  })
  .andThen({
    id: "await-approval",
    execute: async ({ data, suspend }) => {
      // Check if already approved (e.g., from a previous suspension)
      if (data.approved) {
        return data;
      }

      // Suspend the workflow and wait for approval
      return await suspend("Awaiting manager approval for high-value order");
    },
  })
  .andThen({
    id: "process-payment",
    execute: async ({ data }) => {
      console.log(`Processing payment. Approved by: ${data.approvedBy}`);
      return {
        status: "completed",
        approvedBy: data.approvedBy,
      };
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
    incrementingWorkflow,
    testWorkflow,
    approvalWorkflow,
    orderWorkflow,
  },
});
