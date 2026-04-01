---
id: ad-creator
slug: ai-instagram-ad-agent
title: AI Ads Generator Agent
description: Build Instagram ads with VoltAgent, BrowserBase and Gemini.
repository: https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator
---

This example implements an Instagram ad generator with VoltAgent. The system uses BrowserBase Stagehand to analyze landing pages, extracts brand data, and generates visuals through Google Gemini AI.

The implementation includes:

- Web page navigation and analysis via BrowserBase Stagehand
- Brand data extraction (tone, audience, value propositions)
- Screenshot capture for visual reference
- Creative brief generation through AI models
- Ad visual generation using Google Gemini
- Multi-agent workflow orchestration

### Setup

<Info title="Required accounts and API keys:">
- Sign in to [VoltOps LLM Observability platform](https://console.voltagent.dev/login)
- A [BrowserBase account](https://browserbase.com) with API key and project ID
- Google Generative AI access for [Gemini API](https://ai.google.dev/gemini-api)
- An OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys)
</Info>

#### Get the example code

Clone the ad generator example using the VoltAgent CLI:

```bash
npm create voltagent-app@latest -- --example with-ad-creator
cd with-ad-creator
```

You can find the source code of this example [here](https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator).

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

#### Set Up BrowserBase

Configure BrowserBase:

1. Create a BrowserBase account at [browserbase.com](https://browserbase.com)
2. Navigate to your dashboard and create a new project
3. Copy your API key from the API Keys section
4. Copy your Project ID from the project settings
5. Add both values to your `.env` file

For BrowserBase configuration details, see [BrowserBase documentation](https://docs.browserbase.com/introduction).

![browserbase dashboard](https://cdn.voltagent.dev/examples/with-ad-generator/browserbase.png)

#### Configure Google Gemini API

Set up Google Gemini for image generation:

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Get API Key" and create a new API key
3. Enable the Generative AI API in your Google Cloud Console if needed
4. Add the API key to your `.env` file as `GOOGLE_GENERATIVE_AI_API_KEY`

Google Gemini handles creative brief generation and image creation.

#### Start the Development Server

```bash
npm run dev
```

After server startup:

```bash
════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
════════════════════════════════════════════
  ✓ HTTP Server: http://localhost:3141

  VoltOps Platform: https://console.voltagent.dev
════════════════════════════════════════════
[VoltAgent] All packages are up to date
```

The [VoltOps Platform](https://console.voltagent.dev) provides debugging and interaction capabilities.

![VoltOps Platform](https://cdn.voltagent.dev/examples/with-ad-generator/voltops-platform.png)

### Agent Architecture

The system consists of three agents:

1. **Supervisor Agent** - Orchestrates the entire workflow and coordinates subagents
2. **Landing Page Analyzer** - Extracts brand information from websites
3. **Ad Creator Agent** - Generates Instagram ads using Google Gemini

VoltAgent agents are autonomous units that execute specific tasks. Each agent has defined responsibilities, tool access, memory persistence, and delegation capabilities. The framework supports multiple LLM providers and includes OpenTelemetry-based observability.

![agent-list](https://cdn.voltagent.dev/examples/with-ad-generator/agents-overall.png)

Agent specifications:

### Landing Page Analyzer Agent

Extracts brand information from websites:

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

![Landing Page Analyzer](https://cdn.voltagent.dev/examples/with-ad-generator/page-analyzer.png)

Functionality:

- Navigates to websites and analyzes content
- Extracts product names, taglines, value propositions
- Identifies target audience and brand attributes
- Captures screenshots for reference
- Outputs structured JSON data

**Tool usage:** BrowserBase integration includes navigation (page loading), screenshot (visual capture), extraction (structured data), and observation (UI element analysis).

### Instagram Ad Creator Agent

Transforms brand data into Instagram ads via Google Gemini:

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

![Ad Creator Agent](https://cdn.voltagent.dev/examples/with-ad-generator/instagram-agent.png)

Functionality:

- Converts brand analysis to creative concepts
- Generates 1:1 aspect ratio ads for Instagram feed
- Uses Google Gemini for image generation
- Provides optimization recommendations
- Embeds generated assets for preview

**Configuration:**

- Model: `gpt-4o-mini` for conversational processing
- Instructions define Instagram ad specifications
- Google Gemini tool integration for image generation
- Memory persistence for context retention
- Agent name: `InstagramAdCreator` for logging

**Gemini models:** Uses `gemini-2.0-flash-exp` for creative briefs and `gemini-2.5-flash-image-preview` for image generation.

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

![Supervisor Agent](https://cdn.voltagent.dev/examples/with-ad-generator/supervisor.png)

Functionality:

- Manages workflow from URL input to ad output
- Coordinates landing page analysis and ad creation agents
- Enforces quality control and brand consistency
- Provides structured output with embedded previews
- Supports parallel processing for multiple URLs

**Workflow sequence:** Enforces analysis-first approach, brand data extraction precedes creative generation, maintains quality control throughout execution.

Infrastructure components:

### Stagehand Session Manager

Maintains singleton browser instance for web automation:

<details>
<summary>Show stagehand-manager.ts</summary>

```typescript
import { Stagehand } from "@browserbasehq/stagehand";

class BrowserAutomationController {
  private static controllerInstance: BrowserAutomationController;
  private browserClient: Stagehand | null = null;
  private isActive = false;
  private lastActivityTime = Date.now();
  private readonly idleTimeLimit = 600000; // 10min in milliseconds
  private cleanupTimer: NodeJS.Timeout;

  private constructor() {
    // Periodic maintenance task for resource management
    this.cleanupTimer = setInterval(() => {
      this.performIdleCleanup();
    }, 60000); // Check every minute
  }

  /**
   * Factory method for obtaining controller reference
   */
  public static getController(): BrowserAutomationController {
    if (!BrowserAutomationController.controllerInstance) {
      BrowserAutomationController.controllerInstance = new BrowserAutomationController();
    }
    return BrowserAutomationController.controllerInstance;
  }

  /**
   * Retrieve or create active browser automation client
   */
  public async getBrowserClient(): Promise<Stagehand> {
    this.lastActivityTime = Date.now();

    try {
      // Create fresh client if needed
      if (!this.browserClient || !this.isActive) {
        this.browserClient = new Stagehand({
          apiKey: process.env.BROWSERBASE_API_KEY,
          projectId: process.env.BROWSERBASE_PROJECT_ID,
          env: "BROWSERBASE",
        });

        try {
          await this.browserClient.init();

          this.isActive = true;
          return this.browserClient;
        } catch (setupError) {
          console.error("Browser client setup failed:", setupError);
          throw setupError;
        }
      }

      // Validate existing connection
      try {
        const pageStatus = await this.browserClient.page.evaluate(() => document.title);

        return this.browserClient;
      } catch (connectionError) {
        // Handle disconnected sessions
        console.error("Connection validation failed:", connectionError);
        if (
          connectionError instanceof Error &&
          (connectionError.message.includes("Target page, context or browser has been closed") ||
            connectionError.message.includes("Session expired") ||
            connectionError.message.includes("context destroyed"))
        ) {
          this.browserClient = new Stagehand({
            apiKey: process.env.BROWSERBASE_API_KEY,
            projectId: process.env.BROWSERBASE_PROJECT_ID,
            env: "BROWSERBASE",
          });
          await this.browserClient.init();
          this.isActive = true;
          return this.browserClient;
        }
        throw connectionError; // Propagate unexpected errors
      }
    } catch (generalError) {
      this.isActive = false;
      this.browserClient = null;
      const errorDetails =
        generalError instanceof Error ? generalError.message : String(generalError);
      throw new Error(`Browser automation client error: ${errorDetails}`);
    }
  }

  /**
   * Resource cleanup for inactive sessions
   */
  private async performIdleCleanup(): Promise<void> {
    if (!this.browserClient || !this.isActive) return;

    const currentTime = Date.now();
    const idleDuration = currentTime - this.lastActivityTime;

    if (idleDuration > this.idleTimeLimit) {
      try {
        await this.browserClient.close();
      } catch (cleanupError) {
        console.error(`Cleanup error encountered: ${cleanupError}`);
      }
      this.browserClient = null;
      this.isActive = false;
    }
  }

  /**
   * Explicit resource release method
   */
  public async terminate(): Promise<void> {
    if (this.browserClient) {
      try {
        await this.browserClient.close();
      } catch (terminationError) {
        console.error(`Termination error: ${terminationError}`);
      }
      this.browserClient = null;
      this.isActive = false;
    }
  }

  /**
   * Cleanup method for proper resource disposal
   */
  public dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Export singleton accessor
const automationController = BrowserAutomationController.getController();

// Compatibility wrapper for existing code
export const sessionManager = {
  ensureStagehand: () => automationController.getBrowserClient(),
  close: () => automationController.terminate(),
};
```

</details>

Implementation:

- Single browser session across tool calls
- Automatic session expiration and reconnection handling
- 10-minute inactivity cleanup
- Singleton pattern prevents multiple instances
- Resource leak prevention

### BrowserBase Tools

Five tools for web interaction:

![Navigate Tool](https://cdn.voltagent.dev/examples/with-ad-generator/tools.png)

#### Page Navigate Tool

Loads websites and waits for content:

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

Features:

- URL navigation with configurable wait strategies
- Returns page title and final URL after redirects
- Waits for full page load
- Error handling for navigation failures
- Default: `networkidle` wait strategy

#### Page Extract Tool

Extracts structured data from web pages:

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

Features:

- AI-based structured data extraction
- Custom Zod schema support for type safety
- Default brand extraction schema
- Handles variable extraction scales

#### Page Observe Tool

Locates and analyzes UI elements:

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

Features:

- AI vision for element location via natural language
- Identifies buttons, forms, images, interactive elements
- Returns element selectors and properties
- Extends beyond CSS selector limitations

#### Page Act Tool

Performs web page interactions:

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

Features:

- Natural language-based interactions (clicks, form fills)
- AI vision for element identification
- Complex interaction sequence handling
- Multi-step workflow navigation

#### Screenshot Tool

Captures visual references:

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

Features:

- Full page or viewport screenshots
- Element-specific captures via CSS selectors
- Automatic output directory saving
- Context sharing with other tools
- Reference images for Gemini generation

### Google Gemini Image Generation Tool

Orchestrates image generation pipeline:

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

![Gemini Tool](https://cdn.voltagent.dev/examples/with-ad-generator/gemini-image-generation-tool.png)

Implementation:

- Two-stage generation: creative brief, then image
- Incorporates landing page screenshots as references
- Processes to Instagram square format (1024x1024)
- Local asset storage with public URL generation
- Context maintenance for traceability

**Screenshot integration:** When available, screenshots from landing page analysis are included as references for visual consistency.

### Application Structure

![Agent Running](https://cdn.voltagent.dev/examples/with-ad-generator/complete-app.png)

Application configuration and initialization:

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

**Components:**

**Memory System:**

- `LibSQLMemoryAdapter` for SQLite persistence
- 100-message limit per conversation
- Shared memory across agents
- Context retention for agent references

**Observability:**

- `LibSQLObservabilityAdapter` for trace logging
- VoltOps platform integration
- Agent interaction and tool execution tracking
- Decision path monitoring

**VoltAgent Core:**

- `InstagramAdSupervisor` as main orchestrator
- Automatic subagent management (LandingPageAnalyzer, InstagramAdCreator)
- Pino logger for structured logging
- End-to-end workflow execution

### Running the Agent

The agent handles Instagram ad generation via conversational interface.

![Application Architecture](https://cdn.voltagent.dev/examples/with-ad-generator/overall.png)

Usage:

#### Step 1: Connect to VoltOps

1. Start the server with `npm run dev`
2. Open [console.voltagent.dev](https://console.voltagent.dev)
3. Your local instance automatically connects
4. Select the `InstagramAdSupervisor` agent

#### Step 2: Generate an Ad

Provide a prompt like:

```
Go to https://www.amazon.com/Roku-Streaming-Stick-Plus-2025/dp/B0DXY833HV and extract brand information for Instagram ad
```

The supervisor will:

1. Analyze the landing page
2. Extract brand information
3. Capture screenshots
4. Generate creative brief
5. Create Instagram ad with Gemini
6. Return the ad with preview

### Next Steps

Potential enhancements:

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
