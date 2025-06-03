import { VoltAgentObservabilitySDK } from "@voltagent/sdk";

const sdk = new VoltAgentObservabilitySDK({
  baseUrl: process.env.VOLTAGENT_BASE_URL || "https://api.voltagent.dev",
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "demo-public-key",
  secretKey: process.env.VOLTAGENT_SECRET_KEY || "demo-secret-key",
  autoFlush: true, // Automatic event submission
  flushInterval: 3000, // Send every 3 seconds
});

/**
 * Simulated delay for demo purposes
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Simulated weather API call
 */
async function callWeatherAPI(_city: string): Promise<{ temperature: number; condition: string }> {
  await sleep(500); // API delay simulation

  // Simulated weather data for cities around the world
  return { temperature: 24, condition: "rainy" };
}

/**
 * Simulated web search API
 */
async function searchWeb(query: string): Promise<string[]> {
  await sleep(300);
  return [
    `Search result 1 for: ${query}`,
    `Search result 2 for: ${query}`,
    `Search result 3 for: ${query}`,
  ];
}

/**
 * Simulated translation service
 */
async function translateText(text: string, targetLang: string): Promise<string> {
  await sleep(400);
  return `[${targetLang.toUpperCase()}] ${text}`;
}

// ===== MAIN EXAMPLES =====

/**
 * Basic Trace and Agent Example
 */
async function basicTraceExample() {
  console.log("\n🚀 Basic Trace and Agent Example Starting...");

  try {
    // 1. Create new trace
    const trace = await sdk.trace({
      agentId: "weather-agent-v1",
      input: { query: "What's the weather in Tokyo?" },
      userId: "user-123",
      conversationId: "conv-456",
      tags: ["weather", "basic-example"],
      metadata: {
        source: "sdk-example",
        version: "1.0",
      },
    });

    console.log(`✅ Trace created: ${trace.id}`);

    // 2. Add main agent
    const agent = await trace.addAgent({
      name: "Weather Agent",
      input: { city: "Tokyo" },
      instructions:
        "You are a weather agent. You are responsible for providing weather information to the user.",
      metadata: {
        modelParameters: {
          model: "test-model",
        },
      },
    });

    console.log(`✅ Main agent added: ${agent.id}`);

    // 3. Add tool to agent
    const weatherTool = await agent.addTool({
      name: "weather-api",
      input: {
        city: "Tokyo",
        units: "celsius",
      },
      metadata: {
        apiVersion: "v2",
        timeout: 5000,
      },
    });

    console.log(`🔧 Weather tool started: ${weatherTool.id}`);

    // 4. Simulate weather API call
    try {
      const weatherData = await callWeatherAPI("Tokyo");
      await weatherTool.success({
        output: {
          temperature: weatherData.temperature,
          condition: weatherData.condition,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          dataSource: "weather-api-v2",
        },
      });
      console.log(
        `✅ Weather tool successful: ${weatherData.temperature}°C, ${weatherData.condition}`,
      );
    } catch (error) {
      await weatherTool.error({
        statusMessage: error as Error,
        metadata: {
          errorType: "api-failure",
          retryAttempted: false,
        },
      });
      console.log(`❌ Weather tool error: ${(error as Error).message}`);
    }

    // 5. Add memory operation
    const memoryOp = await agent.addMemory({
      name: "cache-weather-data",
      input: {
        key: "weather_tokyo",
        value: { temp: 24, condition: "rainy", cached_at: Date.now() },
        ttl: 3600, // 1 hour cache
      },
      metadata: {
        type: "redis",
        region: "ap-northeast-1",
      },
    });

    console.log(`💾 Memory operation started: ${memoryOp.id}`);
    await memoryOp.success({
      output: {
        cached: true,
        key: "weather_tokyo",
        dataSize: "124 bytes",
      },
      metadata: {
        cacheHit: false,
        ttl: 3600,
      },
    });
    console.log("✅ Memory operation successful");

    // 6. Complete agent successfully
    await agent.success({
      output: {
        response: "Weather in Tokyo is 24°C and rainy.",
        confidence: 0.95,
        sources: ["weather-api"],
      },
      usage: {
        promptTokens: 45,
        completionTokens: 25,
        totalTokens: 70,
      },
    });

    console.log("✅ Main agent completed");

    // 7. End trace
    await trace.end({
      output: {
        response: "Weather query completed successfully",
        totalDuration: "1.2s",
      },
      status: "completed",
      usage: {
        promptTokens: 45,
        completionTokens: 25,
        totalTokens: 70,
      },
      metadata: {
        totalOperations: 3,
        successRate: 1.0,
      },
    });

    console.log(`🎉 Trace completed: ${trace.id}`);
  } catch (error) {
    console.error("❌ Basic example error:", error);
  }
}

/**
 * Complex Multi-Agent Hierarchy Example
 */
async function complexHierarchyExample() {
  console.log("\n🌟 Complex Multi-Agent Hierarchy Example Starting...");

  try {
    // 1. Create research trace
    const trace = await sdk.trace({
      agentId: "research-coordinator",
      input: {
        topic: "Global AI developments and emerging trends",
        depth: "comprehensive",
        languages: ["en", "zh", "es"],
      },
      userId: "researcher-789",
      conversationId: "research-session-001",
      tags: ["research", "multi-agent", "ai-trends", "global"],
      metadata: {
        priority: "high",
        deadline: "2024-06-01",
        requester: "research-team",
      },
    });

    console.log(`✅ Research trace created: ${trace.id}`);

    // 2. Main Coordinator Agent
    const coordinator = await trace.addAgent({
      name: "Research Coordinator",
      input: {
        task: "Coordinate global AI research project and manage sub-agents",
        strategy: "divide-and-conquer",
      },
      metadata: {
        role: "coordinator",
        experience_level: "senior",
        specialization: "research-management",
        modelParameters: {
          model: "gpt-4",
        },
      },
    });

    console.log(`👑 Coordinator agent created: ${coordinator.id}`);

    // 3. Add retriever to coordinator (for research planning)
    const planningRetriever = await coordinator.addRetriever({
      name: "research-planning-retriever",
      input: {
        query: "AI research methodology best practices",
        sources: ["academic-db", "research-guidelines"],
        maxResults: 10,
      },
      metadata: {
        vectorStore: "pinecone",
        embeddingModel: "text-embedding-ada-002",
      },
    });

    console.log(`🔍 Planning retriever started: ${planningRetriever.id}`);
    await planningRetriever.success({
      output: {
        documents: [
          "Research methodology guide for AI topics",
          "Best practices for multi-agent coordination",
          "Academic research standards for AI studies",
        ],
        relevanceScores: [0.95, 0.88, 0.82],
      },
      metadata: {
        searchTime: "0.3s",
        vectorSpace: "1536-dimensions",
      },
    });

    // 4. SUB-AGENT 1: Data Collection Agent
    const dataCollector = await coordinator.addAgent({
      name: "Data Collection Agent",
      input: {
        task: "Collect data about global AI developments and trends",
        sources: ["news", "academic-papers", "tech-reports", "industry-analysis"],
        timeframe: "last-2-years",
      },
      metadata: {
        role: "data-collector",
        specialization: "global-ai-landscape",
        modelParameters: {
          model: "gpt-4",
        },
      },
    });

    console.log(`📊 Data collector sub-agent created: ${dataCollector.id}`);

    // 4a. Add web search tool to data collector
    const webSearchTool = await dataCollector.addTool({
      name: "web-search-tool",
      input: {
        query: "global artificial intelligence developments trends 2023 2024",
        searchEngine: "google",
        maxResults: 20,
      },
      metadata: {
        searchType: "comprehensive",
        language: "en",
      },
    });

    console.log(`🔍 Web search tool started: ${webSearchTool.id}`);

    try {
      const searchResults = await searchWeb("global artificial intelligence developments trends");
      await webSearchTool.success({
        output: {
          results: searchResults,
          totalFound: searchResults.length,
          searchTime: "0.8s",
        },
        metadata: {
          searchEngine: "google",
          resultsFiltered: true,
        },
      });
      console.log(`✅ Web search successful: ${searchResults.length} results found`);
    } catch (error) {
      await webSearchTool.error({
        statusMessage: error as Error,
        metadata: {
          searchEngine: "google",
          queryType: "comprehensive",
        },
      });
    }

    // 4b. Add memory operation to data collector (store collected data)
    const dataMemory = await dataCollector.addMemory({
      name: "collected-data-storage",
      input: {
        key: "global_ai_data_2024",
        value: {
          sources: ["news-articles", "academic-papers", "tech-reports"],
          dataPoints: 85,
          lastUpdated: new Date().toISOString(),
        },
        category: "research-data",
      },
      metadata: {
        storageType: "long-term",
        encryption: true,
      },
    });

    console.log(`💾 Data memory operation started: ${dataMemory.id}`);
    await dataMemory.success({
      output: {
        stored: true,
        dataSize: "4.7MB",
        compressionRatio: 0.65,
      },
    });

    // 4c. SUB-SUB-AGENT: Academic Paper Analyzer (under Data Collector)
    const paperAnalyzer = await dataCollector.addAgent({
      name: "Academic Paper Analyzer",
      input: {
        task: "Analyze academic papers and extract key findings from global AI research",
        focus: "global-ai-research-trends",
        analysisDepth: "detailed",
      },
      metadata: {
        role: "academic-analyzer",
        specialization: "paper-analysis",
        modelParameters: {
          model: "gpt-4",
        },
      },
    });

    console.log(`📚 Academic paper analyzer (sub-sub-agent) created: ${paperAnalyzer.id}`);

    // Add tool to paper analyzer
    const paperAnalysisTool = await paperAnalyzer.addTool({
      name: "paper-analysis-tool",
      input: {
        papers: ["arxiv_paper_1.pdf", "nature_ai_2024.pdf", "ieee_ml_trends.pdf"],
        analysisType: "content-extraction",
        language: "mixed",
      },
      metadata: {
        pdfParser: "advanced",
        nlpModel: "bert-multilingual",
      },
    });

    console.log(`🔬 Paper analysis tool started: ${paperAnalysisTool.id}`);
    await paperAnalysisTool.success({
      output: {
        analyzedPapers: 3,
        keyFindings: [
          "Multimodal AI systems showing 60% improvement in 2024",
          "Enterprise AI adoption reached 70% globally",
          "Significant breakthroughs in AI safety and alignment",
        ],
        confidence: 0.89,
      },
      metadata: {
        processingTime: "12.3s",
        nlpModel: "bert-multilingual-v2",
      },
    });

    // Complete paper analyzer
    await paperAnalyzer.success({
      output: {
        summary: "3 academic papers analyzed successfully",
        keyInsights: ["Multimodal AI advances", "Enterprise adoption growth", "AI safety progress"],
        nextSteps: ["Deep dive into multimodal research", "Enterprise case studies analysis"],
      },
      metadata: {
        totalPapersProcessed: 3,
        analysisAccuracy: 0.94,
      },
    });

    // 5. SUB-AGENT 2: Translation Agent
    const translator = await coordinator.addAgent({
      name: "Translation Agent",
      input: {
        task: "Translate collected data to multiple languages",
        sourceLanguage: "english",
        targetLanguages: ["spanish", "chinese", "french"],
        preserveTerminology: true,
      },
      metadata: {
        role: "translator",
        specialization: "technical-translation",
        languages: ["en", "es", "zh", "fr"],
        modelParameters: {
          model: "gpt-4",
        },
      },
    });

    console.log(`🌍 Translation sub-agent created: ${translator.id}`);

    // 5a. Add translation tool
    const translationTool = await translator.addTool({
      name: "ai-translation-tool",
      input: {
        text: "Multimodal AI systems are showing significant improvements in 2024",
        fromLang: "en",
        toLang: "es",
        domain: "technology",
      },
      metadata: {
        model: "neural-translation-v3",
        qualityCheck: true,
      },
    });

    console.log(`🔤 Translation tool started: ${translationTool.id}`);

    try {
      const translatedText = await translateText(
        "Multimodal AI systems are showing significant improvements in 2024",
        "es",
      );
      await translationTool.success({
        output: {
          translatedText,
          confidence: 0.96,
          wordCount: 10,
        },
        metadata: {
          model: "neural-translation-v3",
        },
      });
      console.log(`✅ Translation successful: ${translatedText}`);
    } catch (error) {
      await translationTool.error({
        statusMessage: error as Error,
        metadata: {
          translationPair: "en-es",
          model: "neural-translation-v3",
        },
      });
    }

    // 5b. SUB-SUB-AGENT: Quality Checker (under Translator)
    const qualityChecker = await translator.addAgent({
      name: "Translation Quality Control Agent",
      input: {
        task: "Check translation quality and suggest improvements",
        criteria: ["accuracy", "fluency", "terminology"],
        threshold: 0.9,
      },
      metadata: {
        role: "quality-checker",
        specialization: "translation-qa",
        modelParameters: {
          model: "gpt-4",
        },
      },
    });

    console.log(`✅ Quality checker (sub-sub-agent) created: ${qualityChecker.id}`);

    // Add retriever to quality checker (for terminology verification)
    const terminologyRetriever = await qualityChecker.addRetriever({
      name: "ai-terminology-retriever",
      input: {
        query: "AI technical terms multilingual translation verification",
        domain: "artificial-intelligence",
        verificationMode: true,
      },
      metadata: {
        terminologyDB: "global-tech-terms-v3",
        languages: ["en", "es", "zh", "fr"],
      },
    });

    console.log(`📖 Terminology retriever started: ${terminologyRetriever.id}`);
    await terminologyRetriever.success({
      output: {
        verifiedTerms: [
          "multimodal AI -> IA multimodal (es)",
          "artificial intelligence -> inteligencia artificial (es)",
          "machine learning -> aprendizaje automático (es)",
        ],
        accuracy: 0.98,
      },
      metadata: {
        databaseVersion: "global-tech-terms-v3",
      },
    });

    // Complete quality checker
    await qualityChecker.success({
      output: {
        qualityScore: 0.94,
        issues: [],
        recommendations: ["Excellent translation quality", "Terminology consistency maintained"],
      },
      usage: {
        promptTokens: 120,
        completionTokens: 80,
        totalTokens: 200,
      },
      metadata: {
        criteriaChecked: 3,
      },
    });

    // Complete translator
    await translator.success({
      output: {
        translationCompleted: true,
        totalWords: 250,
        averageQuality: 0.94,
      },
      usage: {
        promptTokens: 350,
        completionTokens: 180,
        totalTokens: 530,
      },
      metadata: {
        languagePairs: ["en-es", "en-zh", "en-fr"],
        qualityThreshold: 0.9,
      },
    });

    // 6. Complete data collector
    await dataCollector.success({
      output: {
        dataCollected: true,
        totalSources: 25,
        keyDataPoints: 45,
      },
      usage: {
        promptTokens: 450,
        completionTokens: 280,
        totalTokens: 730,
      },
      metadata: {
        subAgentsUsed: 1,
        analysisAccuracy: 0.91,
      },
    });

    // 7. Add final memory operation to coordinator
    const finalResults = await coordinator.addMemory({
      name: "final-research-results",
      input: {
        key: "global_ai_research_final",
        value: {
          dataPoints: 85,
          translations: 250,
          qualityScore: 0.94,
          completedAt: new Date().toISOString(),
        },
        category: "final-results",
      },
      metadata: {
        storageType: "permanent",
        backup: true,
      },
    });

    console.log(`💾 Final results memory started: ${finalResults.id}`);
    await finalResults.success({
      output: {
        stored: true,
        archived: true,
        backupLocation: "s3://research-backups/",
      },
      metadata: {
        storageProvider: "aws-s3",
      },
    });

    // 8. Complete coordinator
    await coordinator.success({
      output: {
        projectCompleted: true,
        subAgentsManaged: 2,
        totalOperations: 8,
        overallSuccess: true,
        summary: "Global AI research completed successfully",
        recommendations: [
          "Continue monitoring global AI development trends",
          "Schedule follow-up research in 6 months",
          "Share findings with international research community",
        ],
      },
      usage: {
        promptTokens: 1200,
        completionTokens: 850,
        totalTokens: 2050,
      },
      metadata: {
        successRate: 1.0,
      },
    });

    console.log("👑 Coordinator agent completed");

    // 9. End trace
    await trace.end({
      output: {
        projectSummary: "Multi-agent global research project completed successfully",
        totalAgents: 5, // 1 coordinator + 2 sub-agents + 2 sub-sub-agents
        totalOperations: 12,
      },
      status: "completed",
      usage: {
        promptTokens: 1200,
        completionTokens: 850,
        totalTokens: 2050,
      },
      metadata: {
        complexity: "high",
        agentHierarchy: "3-levels",
      },
    });

    console.log(`🎉 Complex hierarchy trace completed: ${trace.id}`);
  } catch (error) {
    console.error("❌ Complex example error:", error);
  }
}

/**
 * Error Handling Example
 */
async function errorHandlingExample() {
  console.log("\n⚠️ Error Handling Example Starting...");

  try {
    const trace = await sdk.trace({
      agentId: "error-test-agent",
      input: { testType: "error-scenarios" },
    });

    const agent = await trace.addAgent({
      name: "Error Test Agent",
      input: { scenario: "api-failure" },
    });

    // Failed tool example
    const failingTool = await agent.addTool({
      name: "failing-api-tool",
      input: { endpoint: "https://nonexistent-api.com/data" },
    });

    // Simulated API failure
    await failingTool.error({
      statusMessage: new Error("API endpoint not reachable"),
      metadata: {
        endpoint: "https://nonexistent-api.com/data",
        httpStatus: 404,
      },
    });
    console.log("❌ Tool error recorded");

    // Mark agent as failed as well
    await agent.error({
      statusMessage: new Error("Agent failed due to tool failure"),
      metadata: {
        failedTool: failingTool.id,
        errorCategory: "api_failure",
      },
    });
    console.log("❌ Agent error recorded");

    // End trace with error status
    await trace.end({
      output: {
        error: "Agent execution failed",
        failurePoint: "api-tool-execution",
      },
      status: "error",
      metadata: {
        totalErrors: 2,
        duration: "0.5s",
      },
    });
    console.log("❌ Trace terminated with error");
  } catch (error) {
    console.error("❌ Error handling example error:", error);
  }
}

// ===== MAIN FUNCTION =====

async function main() {
  console.log("🌟 VoltAgent SDK - Comprehensive Trace and Agent Hierarchy Examples");
  console.log("=".repeat(70));

  try {
    // 1. Basic example
    await basicTraceExample();

    // 2. Complex hierarchy example
    await complexHierarchyExample();

    // 3. Error handling example
    await errorHandlingExample();

    console.log("\n✅ All examples completed!");

    // Final flush operation
    await sdk.flush();
    console.log("📤 All events sent");
  } catch (error) {
    console.error("❌ Main function error:", error);
  } finally {
    // Shutdown SDK
    await sdk.shutdown();
    console.log("🔒 SDK shutdown");
  }
}

main().catch(console.error);
