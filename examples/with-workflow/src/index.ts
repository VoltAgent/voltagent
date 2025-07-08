import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, VoltOpsClient, createWorkflowChain } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { z } from "zod";

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTOPS_PUBLIC_KEY,
  secretKey: process.env.VOLTOPS_SECRET_KEY,
});

const languageDetectionAgent = new Agent({
  name: "LanguageDetectionAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: `You are a language detection expert. Analyze the input text and determine the language it's written in. 
  Return the language code (e.g., 'en' for English, 'es' for Spanish, 'fr' for French, 'de' for German, 'it' for Italian, 'pt' for Portuguese, 'ja' for Japanese, 'ko' for Korean, 'zh' for Chinese, 'ar' for Arabic, 'hi' for Hindi, 'ru' for Russian).
  If the text contains multiple languages, identify the primary language.
  If you cannot determine the language, return 'unknown'.`,
});

const translationAgent = new Agent({
  name: "TranslationAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: `You are a professional translator. Translate the given text to the target language while preserving the original meaning, tone, and context.
  Maintain the same level of formality and cultural sensitivity.
  If the text is already in the target language, return it unchanged.
  If translation is not possible or the target language is not supported, explain why.`,
});

// Initialize VoltAgent with VoltOps client
new VoltAgent({
  agents: {
    languageDetectionAgent,
    translationAgent,
  },
  voltOpsClient: voltOpsClient,
});

// Create a comprehensive translation workflow
const translationWorkflow = createWorkflowChain({
  id: "translation-workflow",
  name: "Multi-Language Translation Workflow",
  purpose: "Detect language, analyze content, and translate text to target language",
  input: z.object({
    originalText: z.string(),
    targetLanguage: z.string(),
  }),
  result: z.object({
    originalText: z.string(),
    detectedLanguage: z.string(),
    targetLanguage: z.string(),
    translatedText: z.string(),
    confidence: z.number().min(0).max(1),
    processingTime: z.number(),
  }),
})
  .andAgent("Detect Language", languageDetectionAgent, {
    schema: z.object({
      detectedLanguage: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  })
  .andThen({
    execute: async (data, state) => {
      // If the detected language is the same as target language, skip translation
      if (data.detectedLanguage === state.input.targetLanguage) {
        return {
          ...data,
          translatedText: state.input.originalText,
          processingTime: Date.now() - state.startAt.getTime(),
        };
      }

      // If language is unknown, return error
      if (data.detectedLanguage === "unknown") {
        throw new Error("Unable to detect the language of the input text");
      }

      return data;
    },
  })
  .andAgent("Translate Text", translationAgent, {
    schema: z.object({
      translatedText: z.string(),
    }),
  })
  .andThen({
    execute: async (data, state) => {
      return {
        ...data,
        processingTime: Date.now() - state.startAt.getTime(),
      };
    },
  });

// Example usage function
async function processTranslation(inputText: string, targetLanguage = "en") {
  try {
    const { result } = await translationWorkflow.run({
      originalText: inputText,
      targetLanguage,
    });

    console.log("🌍 Translation Workflow Results:");
    console.log("=".repeat(50));
    console.log(`📝 Original Text: ${result.originalText}`);
    console.log(
      `🔍 Detected Language: ${result.detectedLanguage} (confidence: ${(result.confidence * 100).toFixed(1)}%)`,
    );
    console.log(`🎯 Target Language: ${result.targetLanguage}`);
    console.log(`🔄 Translated Text: ${result.translatedText}`);
    console.log(`\n⏱️  Processing Time: ${result.processingTime}ms`);
    console.log("=".repeat(50));

    return result;
  } catch (error) {
    console.error("❌ Translation workflow failed:", error);
    throw error;
  }
}

// Example usage
async function main() {
  console.log("🚀 Starting VoltAgent Translation Workflow Example\n");

  // Example 1: Spanish to English
  await processTranslation(
    "¡Hola! Me gustaría saber más sobre el producto VoltAgent. ¿Pueden ayudarme con información sobre precios?",
    "en",
  );

  console.log("\n");

  // Example 2: French to English
  await processTranslation(
    "Bonjour! Je suis intéressé par votre service de support client. Pouvez-vous me donner plus de détails?",
    "en",
  );

  console.log("\n");

  // Example 3: German to Spanish
  await processTranslation(
    "Guten Tag! Ich habe eine Frage zu Ihrer API-Dokumentation. Können Sie mir helfen?",
    "es",
  );

  console.log("\n");

  // Example 4: Japanese to English
  await processTranslation(
    "こんにちは!VoltAgentについて詳しく教えてください。料金プランはありますか?",
    "en",
  );
}

// Run the example
main().catch(console.error);
