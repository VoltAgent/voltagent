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
  InMemoryStorage,
} from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { z } from "zod";
import { PostgresStorage } from "@voltagent/postgres";

const memoryStorage = new PostgresStorage({
  // Read connection details from environment variables
  connection: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number.parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "voltagent-memory",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "password",
    ssl: process.env.POSTGRES_SSL === "true",
  },
  // Alternative: Use connection string
  // connection: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/voltagent",

  // Optional: Customize table names
  tablePrefix: "voltagent_memory",

  // Optional: Configure connection pool
  maxConnections: 10,

  // Optional: Set storage limit for messages
  storageLimit: 100,

  // Optional: Enable debug logging for storage
  debug: process.env.NODE_ENV === "development",
});

// Simple agent for demonstrations
const simpleAgent = new Agent({
  name: "SimpleAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: "You are a helpful assistant. Answer briefly and clearly.",
});

// Analysis agent for dynamic processing
const analysisAgent = new Agent({
  name: "AnalysisAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions:
    "You are an expert analyst. Analyze the given item and provide structured insights.",
});

// ==========================================
// DYNAMIC PARALLEL PROCESSING EXAMPLE
// ==========================================
const dynamicParallelWorkflow = createWorkflowChain({
  id: "dynamic-parallel-example",
  name: "Dynamic Parallel Processing",
  purpose: "Demonstrates dynamic parallel processing of array items",
  input: z.object({
    items: z.array(z.string()),
  }),
  result: z.object({
    originalItems: z.array(z.string()),
    processedItems: z.array(
      z.object({
        original: z.string(),
        analysis: z.string(),
        wordCount: z.number(),
        sentiment: z.string(),
        processed: z.boolean(),
      }),
    ),
    summary: z.object({
      totalItems: z.number(),
      totalWords: z.number(),
      completedAt: z.string(),
    }),
  }),
})
  // İlk adım: Array'i hazırla
  .andThen({
    name: "prepare-items",
    execute: async (data) => {
      console.log(`🔄 Preparing ${data.items.length} items for parallel processing...`);
      return {
        originalItems: data.items,
        items: data.items.map((item, index) => ({
          id: `item-${index}`,
          content: item,
          index,
        })),
      };
    },
  })
  // Dinamik paralel işleme - Her item için aynı agent'i çalıştır
  .andThen({
    name: "analyze-items-parallel",
    execute: async (data) => {
      console.log(`🚀 Starting parallel analysis of ${data.items.length} items...`);

      // Her item için paralel olarak agent çağrıları yap
      const results = await Promise.all(
        data.items.map(async (item) => {
          console.log(
            `  📊 Processing item ${item.index + 1}: "${item.content.substring(0, 30)}..."`,
          );

          // Agent'i çağır
          const { object: analysis } = await analysisAgent.generateObject(
            `Analyze this text and provide insights: "${item.content}"`,
            z.object({
              analysis: z.string(),
              sentiment: z.enum(["positive", "negative", "neutral"]),
              wordCount: z.number(),
            }),
          );

          return {
            original: item.content,
            analysis: analysis.analysis,
            wordCount: analysis.wordCount,
            sentiment: analysis.sentiment,
            processed: true,
          };
        }),
      );

      console.log(`✅ Completed parallel analysis of ${results.length} items`);

      return {
        ...data,
        processedItems: results,
      };
    },
  })
  // Son adım: Özet oluştur
  .andThen({
    name: "create-summary",
    execute: async (data) => {
      const totalWords = data.processedItems.reduce((sum, item) => sum + item.wordCount, 0);

      return {
        originalItems: data.originalItems,
        processedItems: data.processedItems,
        summary: {
          totalItems: data.processedItems.length,
          totalWords,
          completedAt: new Date().toISOString(),
        },
      };
    },
  });

// ==========================================
// COMPREHENSIVE EXAMPLE - ALL STEPS TOGETHER
// ==========================================
const comprehensiveWorkflow = createWorkflowChain({
  id: "comprehensive-example",
  name: "Complete Workflow Example",
  purpose: "Uses all 5 workflow steps in one simple flow",
  input: z.object({
    text: z.string(),
  }),
  result: z.object({
    processed: z.string(),
    aiResponse: z.string(),
    calculations: z.array(
      z.object({
        operation: z.string(),
        value: z.number(),
      }),
    ),
    winner: z.string(),
    isLong: z.boolean(),
    summary: z.string().optional(),
  }),
})
  // Step 1: andThen - Basic text processing
  .andThen({
    name: "process-text",
    execute: async (data) => {
      return {
        processed: data.text.trim().toLowerCase(),
      };
    },
  })
  // Step 2: andAgent - AI analysis
  .andAgent(
    async (data) => `Summarize this text in one sentence: "${data.processed}"`,
    simpleAgent,
    {
      schema: z.object({
        aiResponse: z.string(),
      }),
    },
  )
  // Step 3: andAll - Parallel calculations
  .andAll({
    name: "parallel-calculations",
    steps: [
      andThen({
        name: "word-count",
        execute: async (data) => {
          return { operation: "word_count", value: data.aiResponse.split(" ").length };
        },
      }),
      andThen({
        name: "char-count",
        execute: async (data) => {
          return { operation: "char_count", value: data.aiResponse.length };
        },
      }),
    ],
  })
  .andThen({
    name: "format-calculations",
    execute: async (data) => {
      return {
        calculations: data,
      };
    },
  })
  // Step 4: andRace - Quick response
  .andRace({
    name: "race-responses",
    steps: [
      // @ts-ignore
      andThen({
        name: "fast",
        execute: async (data) => {
          await new Promise((resolve) => setTimeout(resolve, 300));
          return { ...data, winner: "fast" };
        },
      }),
      // @ts-ignore
      andThen({
        name: "slow",
        execute: async (data) => {
          await new Promise((resolve) => setTimeout(resolve, 800));
          return { ...data, winner: "slow" };
        },
      }),
    ],
  })
  // Step 5: andWhen - Conditional summary
  .andThen({
    name: "check-length",
    execute: async (data) => {
      const wordCount =
        data.calculations.find((c: any) => c.operation === "word_count")?.value || 0;
      return {
        ...data,
        isLong: wordCount > 5,
      };
    },
  })
  .andWhen({
    name: "add-summary",
    condition: async (data) => data.isLong,
    step: andThen({
      execute: async (data) => {
        return {
          ...data,
          summary: "This is a long response that needs a summary.",
        };
      },
    }),
  });

// ==========================================
// DEMO FUNCTION FOR COMPREHENSIVE EXAMPLE
// ==========================================
export async function runComprehensiveExample() {
  console.log("🎯 COMPREHENSIVE EXAMPLE - ALL STEPS");
  console.log("=".repeat(50));
  console.log("Uses: andThen → andAgent → andAll → andRace → andWhen\n");

  // Test with short text
  console.log("📝 Testing with SHORT text:");
  const { result: shortResult } = await comprehensiveWorkflow.run({
    text: "Hello world!",
  });

  console.log(`  🔄 Processed: "${shortResult.processed}"`);
  console.log(`  🤖 AI Response: "${shortResult.aiResponse}"`);
  console.log(
    `  📊 Calculations: ${shortResult.calculations.map((c) => `${c.operation}: ${c.value}`).join(", ")}`,
  );
  console.log(`  🏆 Race Winner: "${shortResult.winner}"`);
  console.log(`  📏 Is Long: ${shortResult.isLong}`);
  console.log(`  📝 Summary: ${shortResult.summary || "No summary (short text)"}\n`);

  // Test with long text
  console.log("📝 Testing with LONG text:");
  const { result: longResult } = await comprehensiveWorkflow.run({
    text: "This is a much longer text that contains many words and should trigger the conditional summary generation step.",
  });

  console.log(`  🔄 Processed: "${longResult.processed}"`);
  console.log(`  🤖 AI Response: "${longResult.aiResponse}"`);
  console.log(
    `  📊 Calculations: ${longResult.calculations.map((c) => `${c.operation}: ${c.value}`).join(", ")}`,
  );
  console.log(`  🏆 Race Winner: "${longResult.winner}"`);
  console.log(`  📏 Is Long: ${longResult.isLong}`);
  console.log(`  📝 Summary: ${longResult.summary || "No summary"}`);

  console.log("\n✅ Comprehensive example completed!");
  console.log("🎉 All 5 workflow steps used successfully!");
}

// ==========================================
// ORIGINAL INDIVIDUAL EXAMPLES
// ==========================================
const agentExampleWorkflow = createWorkflowChain({
  id: "agent-example",
  name: "Agent Step Example",
  purpose: "Demonstrates how to use andAgent",
  input: z.object({
    question: z.string(),
  }),
  result: z.object({
    answer: z.string(),
  }),
}).andAgent(async (data) => `Answer this question briefly: ${data.question}`, simpleAgent, {
  schema: z.object({
    answer: z.string(),
  }),
});

// ==========================================
// EXAMPLE 2: andThen - Function Processing
// ==========================================
const functionExampleWorkflow = createWorkflowChain({
  id: "function-example",
  name: "Function Step Example",
  purpose: "Demonstrates how to use andThen",
  input: z.object({
    text: z.string(),
  }),
  result: z.object({
    original: z.string(),
    upper: z.string(),
    wordCount: z.number(),
  }),
}).andThen({
  execute: async (data) => {
    return {
      original: data.text,
      upper: data.text.toUpperCase(),
      wordCount: data.text.split(" ").length,
    };
  },
});

// ==========================================
// EXAMPLE 3: andWhen - Conditional Logic
// ==========================================
const conditionalExampleWorkflow = createWorkflowChain({
  id: "conditional-example",
  name: "Conditional Step Example",
  purpose: "Demonstrates how to use andWhen",
  input: z.object({
    number: z.number(),
  }),
  result: z.object({
    number: z.number(),
    isLarge: z.boolean(),
    specialMessage: z.string().optional(),
  }),
})
  .andThen({
    execute: async (data) => {
      return {
        number: data.number,
        isLarge: data.number > 100,
      };
    },
  })
  .andWhen({
    condition: async (data) => data.isLarge,
    step: andThen({
      execute: async (data) => {
        console.log("executed", data);
        return {
          ...data,
          specialMessage: `This is a large number: ${data.number}!`,
        };
      },
    }),
  });

// ==========================================
// EXAMPLE 4: andAll - Parallel Execution
// ==========================================
const parallelExampleWorkflow = createWorkflowChain({
  id: "parallel-example",
  name: "Parallel Step Example",
  purpose: "Demonstrates how to use andAll with dynamic operations",
  input: z.object({
    numbers: z.array(z.number()),
  }),
  result: z.object({
    results: z.array(
      z.object({
        operation: z.string(),
        value: z.number(),
      }),
    ),
  }),
})
  .andAll({
    name: "parallel-example",
    steps: [
      // Toplam hesaplama
      andThen({
        name: "sum",
        execute: async (data) => {
          const sum = data.numbers.reduce((a, b) => a + b, 0);
          return { operation: "sum", value: sum };
        },
      }),
      // Maksimum değer bulma
      andThen({
        execute: async (data) => {
          const max = Math.max(...data.numbers);
          return { operation: "max", value: max };
        },
      }),
      // Minimum değer bulma
      andThen({
        execute: async (data) => {
          const min = Math.min(...data.numbers);
          return { operation: "min", value: min };
        },
      }),
      // Ortalama hesaplama
      andThen({
        execute: async (data) => {
          const avg = data.numbers.reduce((a, b) => a + b, 0) / data.numbers.length;
          return { operation: "average", value: Math.round(avg * 100) / 100 };
        },
      }),
      // Eleman sayısı
      andThen({
        execute: async (data) => {
          const count = data.numbers.length;
          return { operation: "count", value: count };
        },
      }),
      // Çift sayıların toplamı
      andThen({
        execute: async (data) => {
          const evenSum = data.numbers.filter((n) => n % 2 === 0).reduce((a, b) => a + b, 0);
          return { operation: "even_sum", value: evenSum };
        },
      }),
      // Tek sayıların toplamı
      andThen({
        name: "odd_sum",
        execute: async (data) => {
          const oddSum = data.numbers.filter((n) => n % 2 === 1).reduce((a, b) => a + b, 0);
          return { operation: "odd_sum", value: oddSum };
        },
      }),
      // Pozitif sayıların sayısı
      andThen({
        execute: async (data) => {
          const positiveCount = data.numbers.filter((n) => n > 0).length;
          return { operation: "positive_count", value: positiveCount };
        },
      }),
    ],
  })
  .andThen({
    name: "final",
    execute: async (data) => {
      return {
        results: data,
      };
    },
  });

// ==========================================
// EXAMPLE 5: andRace - Race Execution
// ==========================================
// Note: Temporarily disabled due to type complexity
const raceExampleWorkflow = createWorkflowChain({
  id: "race-example",
  name: "Race Step Example",
  purpose: "Demonstrates how to use andRace",
  input: z.object({
    query: z.string(),
  }),
  result: z.object({
    winner: z.string(),
    response: z.string(),
    timeMs: z.number(),
  }),
}).andRace({
  name: "race-example",
  steps: [
    // @ts-ignore
    andThen({
      name: "fast-service",
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
          winner: "fast-service",
          response: "Quick cached response",
          timeMs: 50,
        };
      },
    }),
    // @ts-ignore
    andThen({
      name: "slow-service",
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return {
          winner: "slow-service",
          response: "Slow response from database",
          timeMs: 100,
        };
      },
    }),
    // @ts-ignore
    andThen({
      name: "mid-service",
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return {
          winner: "mid-service",
          response: "Mid response from database",
          timeMs: 75,
        };
      },
    }),
  ],
});

// ==========================================
// DEMO FUNCTIONS
// ==========================================
export async function runAgentExample() {
  console.log("🤖 AGENT EXAMPLE (andAgent)");
  console.log("=".repeat(40));

  const { result } = await agentExampleWorkflow.run({
    question: "What is the capital of Turkey?",
  });

  console.log("❓ Question: What is the capital of Turkey?");
  console.log(`✅ Answer: ${result.answer}`);
  console.log();
}

export async function runFunctionExample() {
  console.log("⚙️  FUNCTION EXAMPLE (andThen)");
  console.log("=".repeat(40));

  const { result } = await functionExampleWorkflow.run({
    text: "Hello VoltAgent World",
  });

  console.log(`📝 Original: ${result.original}`);
  console.log(`🔠 Uppercase: ${result.upper}`);
  console.log(`📊 Word Count: ${result.wordCount}`);
  console.log();
}

export async function runConditionalExample() {
  console.log("❓ CONDITIONAL EXAMPLE (andWhen)");
  console.log("=".repeat(40));

  // Test with small number
  const { result: result1 } = await conditionalExampleWorkflow.run({ number: 50 });
  console.log(`🔢 Small Number: ${result1.number} | Large: ${result1.isLarge}`);
  console.log(`💬 Message: ${result1.specialMessage || "No special message"}`);

  // Test with large number
  const { result: result2 } = await conditionalExampleWorkflow.run({ number: 150 });
  console.log(`🔢 Large Number: ${result2.number} | Large: ${result2.isLarge}`);
  console.log(`💬 Message: ${result2.specialMessage || "No special message"}`);
  console.log();
}

export async function runParallelExample() {
  console.log("🔄 PARALLEL EXAMPLE (andAll)");
  console.log("=".repeat(40));

  const { result } = await parallelExampleWorkflow.run({
    numbers: [10, 25, 5, 40, 15],
  });

  console.log("📊 Input: [10, 25, 5, 40, 15]");
  result.results.forEach((r) => {
    console.log(`  ${r.operation}: ${r.value}`);
  });
  console.log();
}

export async function runDynamicParallelExample() {
  console.log("🔄 DYNAMIC PARALLEL EXAMPLE (andAll with dynamic steps)");
  console.log("=".repeat(50));
  console.log("Uses: andThen → andAll with dynamic steps\n");

  const { result } = await dynamicParallelWorkflow.run(
    {
      items: [
        "This is a simple text to analyze.",
        "This is another text that needs analysis.",
        "Yet another text for processing.",
      ],
    },
    {
      conversationId: "conversation-123",
      userId: "user-456",
      userContext: new Map<string, string | number>([
        ["name", "John Doe"],
        ["age", 30],
        ["email", "john.doe@example.com"],
        ["sessionId", "session-789"],
      ]),
    },
  );

  console.log("📚 Original Items:");
  result.originalItems.forEach((item, index) => {
    console.log(`  Item ${index + 1}: "${item}"`);
  });

  console.log("\n📊 Processed Items:");
  result.processedItems.forEach((item, index) => {
    console.log(`  Item ${index + 1}:`);
    console.log(`    Original: "${item.original}"`);
    console.log(`    Analysis: "${item.analysis}"`);
    console.log(`    Word Count: ${item.wordCount}`);
    console.log(`    Sentiment: ${item.sentiment}`);
    console.log(`    Processed: ${item.processed}`);
  });

  console.log("\n📈 Summary:");
  console.log(`  Total Items: ${result.summary.totalItems}`);
  console.log(`  Total Words: ${result.summary.totalWords}`);
  console.log(`  Completed At: ${result.summary.completedAt}`);
  console.log();
}

export async function runAllExamples() {
  console.log("🎯 VoltAgent Workflow Step Examples");
  console.log("=".repeat(50));
  console.log("📚 This demonstrates all 5 workflow step types:\n");

  try {
    await runComprehensiveExample();
    /*  console.log(`\n${"=".repeat(50)}\n`);
 
     await runAgentExample();
     await runFunctionExample();
     await runConditionalExample();
     await runParallelExample();
  */
    console.log("✅ All examples completed successfully!");
  } catch (error) {
    console.error("❌ Error running examples:", error);
  }
}

console.log("🚀 VoltAgent Workflow Examples Ready!");
console.log("📚 This example demonstrates all workflow step types:");
console.log("   🎯 COMPREHENSIVE EXAMPLE - Uses ALL 5 steps together!");
console.log("   🤖 andAgent - Execute AI agents");
console.log("   ⚙️  andThen - Execute functions");
console.log("   ❓ andWhen - Conditional execution");
console.log("   🔄 andAll - Parallel execution (wait for all)");
console.log("   🏁 andRace - Parallel execution (first to finish)");
console.log("\n📋 Available example functions:");
console.log("   • runComprehensiveExample() - ALL steps in one workflow!");
console.log("   • runAgentExample() - andAgent step");
console.log("   • runFunctionExample() - andThen step");
console.log("   • runConditionalExample() - andWhen step");
console.log("   • runParallelExample() - andAll step");
console.log("   • runDynamicParallelExample() - Dynamic parallel processing!");
console.log("   • runAllExamples() - Run all examples");
console.log("\n💡 Call runComprehensiveExample() to see all 5 steps working together!");

(async () => {
  // Initialize VoltAgent
  new VoltAgent({
    agents: {
      simpleAgent,
    },
    workflows: {
      dynamicParallelWorkflow,
    },
  });

  setTimeout(async () => {
    await runDynamicParallelExample();
  }, 1000);
})();
