---
id: 4
slug: ai-instagram-ad-agent
title: AI Ads Generator Agent
description: Learn how to build an Instagram ad generator using VoltAgent with BrowserBase Stagehand and Google Gemini.
repository: https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator
---

This example demonstrates an AI-powered Instagram ad generation system using VoltAgent that can analyze any landing page and create professional Instagram ads. The complete system navigates websites with BrowserBase Stagehand, extracts brand insights, and generates Instagram-ready visuals using Google Gemini AI.

This example includes an AI agent system that:

- Navigates and analyzes any marketing page using BrowserBase Stagehand
- Extracts brand tone, audience, and unique value propositions
- Captures screenshots for visual reference and context
- Generates Instagram-ready creative briefs with AI
- Creates professional ad visuals using Google Gemini
- Orchestrates the complete workflow with supervisor agents

### Setup

<Info title="Before you begin, line up these accounts and keys:">
- Sign in to [VoltOps LLM Observability platform](https://console.voltagent.dev/login)
- A [BrowserBase account](https://browserbase.com) with API key and project ID
- Google Generative AI access for [Gemini API](https://ai.google.dev/gemini-api)
- An OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys)
</Info>

#### Get the example code

Use the VoltAgent CLI to get the AI ad generator example from our repository:

```bash
npm create voltagent-app@latest -- --example with-ad-creator
cd with-ad-creator
```

#### Configure environment variables

Create a `.env` file with your API keys:

```env
# Language models
GOOGLE_GENERATIVE_AI_API_KEY=your_google_generative_ai_api_key
OPENAI_API_KEY=your_openai_api_key

# BrowserBase Stagehand
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_browserbase_project_id

# Optional VoltOps tracing
VOLTAGENT_PUBLIC_KEY=your_public_key
VOLTAGENT_SECRET_KEY=your_secret_key
```

#### Set up BrowserBase

First, set up your BrowserBase account:

1. Create a BrowserBase account at [browserbase.com](https://browserbase.com)
2. Navigate to your dashboard and create a new project
3. Copy your API key from the API Keys section
4. Copy your Project ID from the project settings
5. Add both values to your `.env` file

For detailed BrowserBase setup instructions, see the [official BrowserBase documentation](https://docs.browserbase.com/introduction).

![browserbase dashboard](https://cdn.voltagent.dev/examples/with-ad-creator/browserbase.png)

#### Configure Google Gemini API

Set up Google Gemini for image generation:

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Get API Key" and create a new API key
3. Enable the Generative AI API in your Google Cloud Console if needed
4. Add the API key to your `.env` file as `GOOGLE_GENERATIVE_AI_API_KEY`

Google Gemini powers both the creative brief generation and the final image creation, ensuring brand-consistent visuals.

#### Start the development server

```bash
npm run dev
```

Once your server starts successfully, you see:

```bash
════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
════════════════════════════════════════════
  ✓ HTTP Server: http://localhost:3141

  VoltOps Platform: https://console.voltagent.dev
════════════════════════════════════════════
[VoltAgent] All packages are up to date
```

The [VoltOps Platform](https://console.voltagent.dev) link opens automatically, allowing you to interact with and debug your AI ad generator in real-time.

![VoltOps Platform](https://cdn.voltagent.dev/examples/with-ad-creator/voltops-start.png)

### Understanding the Agent Architecture

Let's explore the AI ad generator components and understand how they work together.

The AI ad generator system includes three specialized agents:

1. **Supervisor Agent** - Orchestrates the entire workflow and coordinates subagents
2. **Landing Page Analyzer** - Extracts brand information from websites
3. **Ad Creator Agent** - Generates Instagram ads using Google Gemini

In VoltAgent, agents are autonomous AI entities that can reason, make decisions, and execute tasks. Each agent has a specific purpose, can use tools to interact with external systems, maintain memory for context, and delegate work to other agents. The framework is LLM-agnostic, so agents can run on different providers. With built-in observability (via OpenTelemetry and the VoltOps console), every step of execution is traceable, making complex multi-agent workflows easier to manage and debug.

Let's examine each agent:

### Landing Page Analyzer Agent

This agent specializes in extracting comprehensive brand information from websites:

<details>
<summary>Show landing-page-analyzer.agent.ts</summary>

```typescript
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@voltagent/core";
import { pageNavigateTool } from "../tools/browserbase/page-navigate.tool";
import { pageExtractTool } from "../tools/browserbase/page-extract.tool";
import { pageObserveTool } from "../tools/browserbase/page-observe.tool";
import { screenshotTool } from "../tools/browserbase/screenshot.tool";

export const createLandingPageAnalyzer = (memory: Memory) => {
  return new Agent({
    name: "LandingPageAnalyzer",
    purpose: "Analyze landing pages to extract brand information and marketing insights",
    instructions: `You are a landing page analysis expert specializing in extracting brand information for ad creation.

    Your primary responsibilities:
    1. Navigate to websites and extract comprehensive brand information
    2. Identify product names, taglines, and unique value propositions
    3. Understand target audience demographics and psychographics
    4. Analyze brand voice, tone, and visual style
    5. Capture screenshots for visual reference
    6. Extract key features, benefits, and differentiators

    When analyzing a landing page:
    - First navigate to the URL
    - Take a screenshot for visual reference
    - Extract structured data including:
      * Product/Service name
      * Main tagline or headline
      * Value propositions (primary and secondary)
      * Target audience characteristics
      * Brand personality and tone
      * Key features or benefits
      * Call-to-action messages
      * Color schemes and visual style notes
    - Observe important UI elements like hero sections, CTAs, and feature highlights

    Your analysis should be comprehensive enough to inform creative ad generation.
    Focus on understanding what makes the brand unique and how it positions itself.

    Output format should be structured JSON data that can be easily consumed by other agents.`,
    model: openai("gpt-4o-mini"),
    tools: [pageNavigateTool, pageExtractTool, pageObserveTool, screenshotTool],
    memory,
  });
};
```

</details>

![Landing Page Analyzer](https://cdn.voltagent.dev/examples/with-ad-creator/analyzer-agent.png)

Navigates to any website and performs comprehensive analysis, extracts product names, taglines, and value propositions, identifies target audience and brand personality, captures visual references for ad creation, and outputs structured JSON data for downstream processing. This agent is the intelligence behind understanding brand identity from web presence.

**Tool integration:** The agent uses BrowserBase tools strategically: navigation for loading pages, screenshot for visual capture, extraction for structured data, and observation for UI element analysis. This comprehensive approach ensures no brand detail is missed.

### Instagram Ad Creator Agent

This agent transforms brand insights into professional Instagram ads using Google Gemini:

<details>
<summary>Show ad-creator.agent.ts</summary>

```typescript
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@voltagent/core";
import { generateInstagramAdGeminiTool } from "../tools/image-generation/instagram-ad-gemini.tool";

export const createAdCreatorAgent = (memory: Memory) => {
  return new Agent({
    name: "InstagramAdCreator",
    purpose: "Create compelling Instagram ad visuals using Google Gemini AI",
    instructions: `You are an Instagram advertising specialist using Google's Gemini AI for ad creation.

    Your core competencies:
    1. Transform brand insights into compelling Instagram ad concepts
    2. Create square format (1:1) optimized ads for Instagram feed
    3. Ensure brand consistency while maximizing engagement
    4. Apply Instagram-specific best practices

    Instagram Ad Guidelines:
    - Square format (1:1 aspect ratio, 1024x1024)
    - Visual storytelling focus
    - Clean, aesthetic designs
    - Concise, impactful copy
    - Thumb-stopping visuals
    - Clear visual hierarchy
    - Mobile-first design
    - Instagram's visual culture alignment

    Creative Process:
    1. Analyze brand data from LandingPageAnalyzer
    2. Develop creative concepts aligned with brand identity
    3. Consider Instagram audience preferences
    4. Ensure clear call-to-action integration

    Your output should include:
    - Generated Instagram ad asset (provide the publicUrl)
    - Embed the asset using Markdown: ![Ad Preview](publicUrl)
    - Creative rationale
    - Performance optimization suggestions
    - Engagement predictions`,
    model: openai("gpt-4o-mini"),
    tools: [generateInstagramAdGeminiTool],
    memory,
  });
};
```

</details>

![Ad Creator Agent](https://cdn.voltagent.dev/examples/with-ad-creator/creator-agent.png)

Transforms brand analysis into Instagram-optimized creative concepts, generates square format ads perfect for Instagram feed, uses Google Gemini for intelligent image generation, provides creative rationale and optimization suggestions, and embeds generated assets for immediate preview. This agent bridges the gap between brand understanding and visual execution.

**Key configuration details:**

- Uses `gpt-4o-mini` for cost-effective conversational responses and creative reasoning
- Structured instructions define clear Instagram ad best practices and guidelines
- Tools array provides Google Gemini image generation capability
- Memory integration maintains conversation context across messages
- `name: "InstagramAdCreator"` identifies the agent in logs and traces

**Gemini integration:** The agent leverages two Gemini models - `gemini-2.0-flash-exp` for creative brief generation and `gemini-2.5-flash-image-preview` for actual image creation, ensuring both strategic thinking and visual excellence.

### Supervisor Agent

The supervisor orchestrates the entire workflow and coordinates both subagents:

<details>
<summary>Show supervisor.agent.ts</summary>

```typescript
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import type { Memory } from "@voltagent/core";
import { createLandingPageAnalyzer } from "./landing-page-analyzer.agent";
import { createAdCreatorAgent } from "./ad-creator.agent";

export const createSupervisorAgent = (memory: Memory) => {
  const landingPageAnalyzer = createLandingPageAnalyzer(memory);
  const adCreator = createAdCreatorAgent(memory);

  return new Agent({
    name: "InstagramAdSupervisor",
    purpose:
      "Orchestrate Instagram ad generation workflow from website analysis to final ad creation",
    instructions: `You are the Instagram Ad Generation Supervisor, responsible for orchestrating the Instagram ad creation workflow using Google Gemini AI.

    Your Team:
    1. LandingPageAnalyzer - Extracts brand information from websites
    2. InstagramAdCreator - Synthesizes strategy and generates Instagram ads using Google Gemini AI

    Workflow Management:

    For Single URL → Instagram Ad Generation:
    1. Delegate website analysis to LandingPageAnalyzer
    2. Share extracted insights with InstagramAdCreator
    3. Oversee final ad generation and compile results

    For Parallel Processing:
    - Can delegate multiple tasks simultaneously
    - Coordinate results from parallel executions
    - Aggregate outputs efficiently

    Quality Control:
    - Ensure brand consistency across the final ad
    - Verify the requested format is generated
    - Confirm all deliverables are complete

    Output Organization:
    - Summarize brand analysis findings
    - List the generated ad file with description and public URL
    - Embed final creative using Markdown image syntax so the user can preview it immediately
    - Provide recommendations for usage

    Communication Style:
    - Clear and structured updates
    - Executive summary at the end
    - Highlight key deliverables
    - Include next steps recommendations`,
    model: openai("gpt-4o-mini"),
    subAgents: [landingPageAnalyzer, adCreator],
    supervisorConfig: {
      customGuidelines: [
        "Always start with website analysis before creative work",
        "Focus exclusively on Instagram ad generation",
        "Use Google Gemini AI for intelligent content creation",
        "Ensure the ad output is square format (1:1) for Instagram",
        "Provide the public URL for any generated creative",
        "Embed the generated creative using Markdown image syntax in the final response",
        "Include Instagram-specific optimization recommendations",
      ],
    },
    memory,
  });
};
```

</details>

![Supervisor Agent](https://cdn.voltagent.dev/examples/with-ad-creator/supervisor-agent.png)

Manages the complete workflow from URL to finished ad, coordinates landing page analysis and ad creation agents, ensures quality control and brand consistency, provides structured output with embedded previews, and supports parallel processing for multiple URLs. The supervisor is the brain that ensures all pieces work together seamlessly.

**Workflow orchestration:** The supervisor enforces a strict workflow - always analyzing before creating, ensuring brand insights inform creative decisions, and maintaining quality standards throughout the process.

Now let's explore the infrastructure components that power these agents:

### Stagehand Session Manager

The Stagehand Session Manager maintains a singleton browser instance for efficient web automation:

<details>
<summary>Show stagehand-manager.ts</summary>

```typescript
import { Stagehand } from "@browserbasehq/stagehand";

class StagehandSessionManager {
  private static instance: StagehandSessionManager;
  private stagehand: Stagehand | null = null;
  private initialized = false;
  private lastUsed = Date.now();
  private readonly sessionTimeout = 10 * 60 * 1000; // 10 minutes

  public static getInstance(): StagehandSessionManager {
    if (!StagehandSessionManager.instance) {
      StagehandSessionManager.instance = new StagehandSessionManager();
    }
    return StagehandSessionManager.instance;
  }

  public async ensureStagehand(): Promise<Stagehand> {
    this.lastUsed = Date.now();

    if (!this.stagehand || !this.initialized) {
      this.stagehand = new Stagehand({
        apiKey: process.env.BROWSERBASE_API_KEY,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        env: "BROWSERBASE",
      });
      await this.stagehand.init();
      this.initialized = true;
      return this.stagehand;
    }

    try {
      await this.stagehand.page.evaluate(() => document.title);
      return this.stagehand;
    } catch (error) {
      // Reinitialize if session expired
      this.stagehand = new Stagehand({
        apiKey: process.env.BROWSERBASE_API_KEY,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        env: "BROWSERBASE",
      });
      await this.stagehand.init();
      this.initialized = true;
      return this.stagehand;
    }
  }
}

export const sessionManager = StagehandSessionManager.getInstance();
```

</details>

![Session Manager](https://cdn.voltagent.dev/examples/with-ad-creator/session-manager.png)

Maintains a single browser session across all tool calls, automatically handles session expiration and reconnection, implements cleanup after 10 minutes of inactivity, and provides a singleton pattern to prevent multiple browser instances. This efficient session management ensures fast execution and prevents resource leaks.

### BrowserBase Tools

The system includes five specialized tools for web interaction:

#### Page Navigate Tool

This tool loads websites and waits for content to be ready:

<details>
<summary>Show page-navigate.tool.ts</summary>

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";
import { sessionManager } from "../../stagehand-manager";

export const pageNavigateTool = createTool({
  name: "page_navigate",
  description: "Navigate to a specific URL using BrowserBase",
  parameters: z.object({
    url: z.string().url().describe("The URL to navigate to"),
    waitUntil: z
      .enum(["load", "domcontentloaded", "networkidle"])
      .optional()
      .default("networkidle")
      .describe("When to consider navigation complete"),
  }),
  execute: async ({ url, waitUntil }) => {
    try {
      const stagehand = await sessionManager.ensureStagehand();
      const page = stagehand.page;

      await page.goto(url, { waitUntil });

      const title = await page.title();
      const currentUrl = page.url();

      return {
        success: true,
        url: currentUrl,
        title,
        message: `Successfully navigated to ${url}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Navigation failed: ${errorMessage}`);
    }
  },
});
```

</details>

![Navigate Tool](https://cdn.voltagent.dev/examples/with-ad-creator/navigate-tool.png)

Navigates to any URL with configurable wait strategies, returns page title and final URL after redirects, ensures the page is fully loaded before proceeding, and provides error handling for navigation failures.

The `networkidle` default ensures all resources are loaded.

#### Page Extract Tool

This tool extracts structured data from web pages using AI:

<details>
<summary>Show page-extract.tool.ts</summary>

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";
import { sessionManager } from "../../stagehand-manager";

export const pageExtractTool = createTool({
  name: "page_extract",
  description: "Extract structured data from a webpage using natural language instructions",
  parameters: z.object({
    url: z.string().url().optional().describe("URL to navigate to (optional if already on a page)"),
    instruction: z.string().describe("What to extract (e.g., 'extract all product prices')"),
    schema: z.record(z.any()).optional().describe("Zod schema definition for data extraction"),
    useTextExtract: z
      .boolean()
      .optional()
      .default(false)
      .describe("Set true for larger-scale extractions"),
  }),
  execute: async ({ url, instruction, schema, useTextExtract }) => {
    const stagehand = await sessionManager.ensureStagehand();
    const page = stagehand.page;

    if (url) {
      await page.goto(url, { waitUntil: "networkidle" });
    }

    const defaultBrandSchema = {
      productName: z.string().describe("The product or service name"),
      tagline: z.string().describe("The main tagline or headline"),
      valueProposition: z.string().describe("The unique value proposition"),
      targetAudience: z.string().describe("The target audience"),
      features: z.array(z.string()).describe("Key features or benefits"),
      callToAction: z.string().describe("Main call-to-action text"),
    };

    const finalSchema = schema || defaultBrandSchema;
    const schemaObject = z.object(finalSchema);

    const result = await page.extract({
      instruction,
      schema: schemaObject,
      useTextExtract,
    });

    return {
      success: true,
      data: result,
      url: page.url(),
    };
  },
});
```

</details>

![Extract Tool](https://cdn.voltagent.dev/examples/with-ad-creator/extract-tool.png)

Uses AI to extract structured data from any webpage, supports custom Zod schemas for type-safe extraction, provides a default brand extraction schema for marketing pages, and handles both small and large-scale data extraction. This tool is the core of the landing page analysis capability.

#### Page Observe Tool

This tool locates and analyzes UI elements on web pages:

<details>
<summary>Show page-observe.tool.ts</summary>

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";
import { sessionManager } from "../../stagehand-manager";

export const pageObserveTool = createTool({
  name: "page_observe",
  description: "Observe and locate elements on the current page using AI vision",
  parameters: z.object({
    instruction: z.string().describe("Natural language instruction for what to observe"),
    useVision: z
      .boolean()
      .optional()
      .default(true)
      .describe("Use vision model for element detection"),
  }),
  execute: async ({ instruction, useVision }) => {
    try {
      const stagehand = await sessionManager.ensureStagehand();
      const page = stagehand.page;

      console.log(`Observing page with instruction: ${instruction}`);

      // Use Stagehand's observe method with vision capabilities
      const observations = await stagehand.observe({
        instruction,
        useVision,
      });

      console.log(`Found ${observations.length} elements matching criteria`);

      return {
        success: true,
        elements: observations,
        count: observations.length,
        instruction,
        url: page.url(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Observation failed: ${errorMessage}`);
    }
  },
});
```

</details>

![Observe Tool](https://cdn.voltagent.dev/examples/with-ad-creator/observe-tool.png)

This tool is essential for understanding page layout and finding specific UI components.

Uses AI vision to locate UI elements based on natural language descriptions, identifies buttons, forms, images, and other interactive elements, provides element selectors and properties for interaction, and enables intelligent page understanding beyond simple CSS selectors.

#### Page Act Tool

This tool performs interactions on web page elements:

<details>
<summary>Show page-act.tool.ts</summary>

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";
import { sessionManager } from "../../stagehand-manager";

export const pageActTool = createTool({
  name: "page_act",
  description: "Perform actions on web page elements using natural language",
  parameters: z.object({
    action: z.string().describe("The action to perform (e.g., 'click the login button')"),
    useVision: z.boolean().optional().default(true).describe("Use vision model to find elements"),
  }),
  execute: async ({ action, useVision }) => {
    try {
      const stagehand = await sessionManager.ensureStagehand();
      const page = stagehand.page;

      console.log(`Performing action: ${action}`);

      // Use Stagehand's act method
      await stagehand.act({
        action,
        useVision,
      });

      console.log(`Action completed: ${action}`);

      return {
        success: true,
        action,
        url: page.url(),
        message: `Successfully performed: ${action}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Action failed: ${errorMessage}`);
    }
  },
});
```

</details>

![Act Tool](https://cdn.voltagent.dev/examples/with-ad-creator/act-tool.png)

Performs clicks, form fills, and other interactions using natural language, leverages AI vision to find the right elements to interact with, handles complex interaction sequences automatically, and enables navigation through multi-step workflows. It allows the agent to interact with websites as a human would.

#### Screenshot Tool

This tool captures visual references from web pages:

<details>
<summary>Show screenshot.tool.ts</summary>

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";
import { sessionManager } from "../../stagehand-manager";
import * as fs from "fs/promises";
import * as path from "path";

export const screenshotTool = createTool({
  name: "take_screenshot",
  description: "Take a screenshot of the current page or a specific element",
  parameters: z.object({
    url: z.string().url().optional().describe("URL to navigate to (optional if already on a page)"),
    fullPage: z.boolean().optional().default(false).describe("Whether to capture the full page"),
    selector: z.string().optional().describe("CSS selector for specific element to capture"),
    filename: z.string().optional().describe("Custom filename for the screenshot"),
  }),
  execute: async ({ url, fullPage, selector, filename }, context) => {
    const stagehand = await sessionManager.ensureStagehand();
    const page = stagehand.page;

    if (url) {
      await page.goto(url, { waitUntil: "networkidle" });
    }

    const outputDir = path.join(process.cwd(), "output", "screenshots");
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = Date.now();
    const finalFilename = filename || `screenshot_${timestamp}.png`;
    const filepath = path.join(outputDir, finalFilename);

    let screenshot: Buffer;

    if (selector) {
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Element with selector "${selector}" not found`);
      }
      screenshot = await element.screenshot();
    } else {
      screenshot = await page.screenshot({ fullPage });
    }

    await fs.writeFile(filepath, screenshot);

    // Persist filepath for downstream tools
    context?.context.set("screenshotPath", filepath);
    context?.context.set("screenshotFilename", finalFilename);

    return {
      success: true,
      filepath,
      filename: finalFilename,
      url: page.url(),
      fullPage,
      selector,
    };
  },
});
```

</details>

![Screenshot Tool](https://cdn.voltagent.dev/examples/with-ad-creator/screenshot-tool.png)

Captures full page or viewport screenshots, supports element-specific captures with CSS selectors, automatically saves to the output directory, and shares screenshot paths with other tools via context. The screenshots serve as visual references for Gemini's image generation.

### Google Gemini Image Generation Tool

This tool orchestrates the complete image generation pipeline with Google Gemini:

<details>
<summary>Show instagram-ad-gemini.tool.ts</summary>

```typescript
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import sharp from "sharp";
import * as fs from "fs/promises";
import * as path from "path";

const creativeBriefAgent = new Agent({
  name: "GeminiCreativeBrief",
  purpose: "Transform product information into rich Instagram creative direction",
  instructions:
    "You take raw product inputs and return an inspiring creative direction for an Instagram ad.",
  model: google("gemini-2.0-flash-exp"),
});

const imageGenerationAgent = new Agent({
  name: "GeminiImageGenerator",
  purpose: "Generate high-converting Instagram visuals",
  instructions:
    "You receive fully prepared prompts and return the best possible Instagram-ready visual output.",
  model: google("gemini-2.5-flash-image-preview"),
});

export const generateInstagramAdGeminiTool = createTool({
  name: "generate_instagram_ad_gemini",
  description:
    "Generate a square Instagram ad image using Google Gemini with optional landing page reference",
  parameters: z.object({
    productName: z.string().describe("The product or brand name"),
    tagline: z.string().describe("The main tagline or value proposition"),
    adConcept: z.string().describe("Creative concept for the ad"),
    style: z.string().optional().default("modern and professional").describe("Visual style"),
    targetAudience: z.string().optional().describe("Target audience description"),
  }),
  execute: async ({ productName, tagline, adConcept, style, targetAudience }, context) => {
    const outputDir = path.join(process.cwd(), "output", "ads", "instagram");
    await fs.mkdir(outputDir, { recursive: true });

    // First, generate creative brief
    const { text: adDescription } = await creativeBriefAgent.generateText(
      `Create a detailed visual description for a square Instagram advertisement:
      Product: ${productName}
      Tagline: "${tagline}"
      Concept: ${adConcept}
      Style: ${style}
      ${targetAudience ? `Target audience: ${targetAudience}` : ""}

      Requirements:
      - Include the product name and tagline prominently
      - Eye-catching and scroll-stopping design
      - Modern design principles with clear visual hierarchy
      - Optimized for Instagram feed`,
      { temperature: 0.5 }
    );

    // Prepare image generation with optional screenshot reference
    const userContent = [{ type: "text", text: imagePrompt }];
    const screenshotPath = context?.context.get("screenshotPath");

    if (screenshotPath) {
      const screenshotBuffer = await fs.readFile(screenshotPath);
      const processedScreenshot = await sharp(screenshotBuffer)
        .resize(1024, 1024, { fit: "cover" })
        .png()
        .toBuffer();

      userContent.push({
        type: "image",
        image: processedScreenshot,
        mediaType: "image/png",
      });
    }

    // Generate the Instagram ad
    const imageResult = await imageGenerationAgent.generateText(
      [{ role: "user", content: userContent }],
      {
        providerOptions: {
          google: { responseModalities: ["IMAGE"] },
        },
        temperature: 0.3,
      }
    );

    // Save the generated image
    const buffer = Buffer.from(imageResult.files[0].base64, "base64");
    const filename = `instagram_${productName}_${Date.now()}.png`;
    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, buffer);

    // Create public URL for immediate preview
    const baseUrl = process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? "3141"}`;
    const publicUrl = new URL(path.relative(process.cwd(), filepath), baseUrl).toString();

    return { success: true, publicUrl };
  },
});
```

</details>

![Gemini Tool](https://cdn.voltagent.dev/examples/with-ad-creator/gemini-tool.png)

Orchestrates two-stage Gemini generation , creative brief then image, incorporates landing page screenshots as visual references, processes images to Instagram's square format (1024x1024), saves assets locally and provides public URLs, and maintains context for traceability. This sophisticated pipeline ensures brand-consistent, platform-optimized visuals.

**Reference image integration:** When a screenshot is available from the landing page analysis, the tool automatically includes it as a reference for Gemini, ensuring the generated ad maintains visual consistency with the brand's existing design language.

### The Complete Application Structure

Now let's examine how the complete application is configured and initialized:

<details>
<summary>Show index.ts</summary>

```typescript
import "dotenv/config";
import { VoltAgent, Memory, VoltAgentObservability } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLObservabilityAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { createSupervisorAgent } from "./agents/supervisor.agent";

// Create a logger instance
const logger = createPinoLogger({
  name: "ai-ad-generator",
  level: "info",
});

// Configure persistent memory (LibSQL / SQLite)
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: "file:./.voltagent/memory.db",
    logger: logger.child({ component: "libsql" }),
    storageLimit: 100, // Keep last 100 messages per conversation
  }),
});

// Create the supervisor agent with all subagents
const supervisorAgent = createSupervisorAgent(memory);

// Initialize VoltAgent with Instagram ad generation system using Gemini AI
new VoltAgent({
  agents: {
    InstagramAdSupervisor: supervisorAgent,
  },
  server: honoServer({
    configureApp: (app) => {
      app.use("/output/*", serveStatic({ root: "./" }));
    },
  }),
  logger,
  observability: new VoltAgentObservability({
    storage: new LibSQLObservabilityAdapter({
      url: "file:./.voltagent/observability.db",
    }),
  }),
});
```

</details>

![Application Architecture](https://cdn.voltagent.dev/examples/with-ad-creator/app-architecture.png)

**Key components:**

**Memory System:**

- Uses `LibSQLMemoryAdapter` for lightweight SQLite-based persistence
- Stores last 100 messages per conversation for context retention
- Shared memory across all agents ensures consistency
- Enables agents to reference previous analyses and maintain conversation flow

**Observability & Debugging:**

- Comprehensive trace logging with `LibSQLObservabilityAdapter`
- Integrates with VoltOps platform for visual debugging and monitoring
- Tracks all agent interactions, tool executions, and decision paths
- Essential for understanding and optimizing multi-agent workflows

**VoltAgent Core:**

- Registers `InstagramAdSupervisor` as the main orchestrator
- Supervisor automatically manages subagents (LandingPageAnalyzer and InstagramAdCreator)
- Pino logger provides structured, performant logging throughout
- All components work together seamlessly for end-to-end ad generation

📚 For detailed information about these components, see the [VoltAgent Core Documentation](https://voltagent.dev/docs/core-concepts/).

### Running the AI Agent

Once deployed, your AI agent handles Instagram ad generation through natural conversation.

![Agent Running](https://cdn.voltagent.dev/examples/with-ad-creator/agent-running.png)

Here's how to use the system:

#### Step 1: Connect to VoltOps

1. Start the server with `npm run dev`
2. Open [console.voltagent.dev](https://console.voltagent.dev)
3. Your local instance automatically connects
4. Select the `InstagramAdSupervisor` agent

#### Step 2: Generate Your First Ad

Provide a prompt like:

```
Generate an Instagram ad for https://example.com targeting young entrepreneurs
```

The supervisor will:

1. Analyze the landing page
2. Extract brand information
3. Capture screenshots
4. Generate creative brief
5. Create Instagram ad with Gemini
6. Return the ad with preview

### Next Steps

Now that you have a working Instagram ad generator, consider these enhancements:

1. **Multi-platform support**: Extend to Facebook, Twitter, LinkedIn ad formats
2. **A/B testing variations**: Generate multiple versions for testing
3. **Brand guidelines integration**: Load and apply specific brand rules
4. **Campaign management**: Track and organize multiple ad campaigns
5. **Performance analytics**: Integrate with ad platform APIs for metrics
6. **Template library**: Save successful ad templates for reuse
7. **Batch processing**: Generate ads for entire product catalogs
8. **Localization**: Create region-specific ad variations
9. **Video ad generation**: Extend to Instagram Reels and Stories
10. **Competitive analysis**: Compare generated ads with competitor campaigns
11. **Cost optimization**: Estimate and optimize ad spend recommendations
12. **Approval workflows**: Add review and approval stages before publishing

📚 **Additional Resources:**

- [VoltAgent Documentation](https://voltagent.dev/docs)
- [BrowserBase Stagehand Guide](https://docs.browserbase.com/guides/stagehand)
- [Google Gemini API Reference](https://ai.google.dev/api/rest)
- [Instagram Ads Best Practices](https://business.instagram.com/advertising)
