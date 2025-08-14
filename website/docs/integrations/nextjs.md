---
title: Next.js
description: This guide walks you through setting up VoltAgent in a Next.js application. We'll build a simple AI calculator example using Server Actions and the Vercel AI SDK.
---

# Integrating VoltAgent with Next.js

This guide walks you through setting up VoltAgent in a Next.js application. We'll build a simple AI calculator example using Server Actions and the Vercel AI SDK.

## Quick Start with Example

If you prefer to start directly with the completed example project, you can create it using the following command:

```bash
npm create voltagent-app@latest -- --example with-nextjs
```

This command will scaffold the entire Next.js example project described in this guide.

## Create a New Next.js Project

Start by creating a new Next.js project using the latest version:

```bash
npx create-next-app@latest my-voltagent-app
cd my-voltagent-app
```

Follow the prompts, selecting TypeScript and App Router.

## Install VoltAgent Dependencies

Install the necessary VoltAgent packages and the Vercel AI SDK provider:

```bash
npm install @voltagent/core @voltagent/vercel-ai @voltagent/cli @ai-sdk/openai@^2.0.0 zod@^3.25.0
```

- `@voltagent/core`: The core VoltAgent library.
- `@voltagent/vercel-ai`: Integrates VoltAgent with the Vercel AI SDK.
- `@ai-sdk/openai`: The AI SDK provider for OpenAI (or your preferred LLM provider).
- `@voltagent/cli`: The command-line interface for VoltAgent tasks (e.g., managing updates).
- `zod`: Required by the Vercel AI SDK for schema validation.

## Configure `next.config.js`

Next.js might try to bundle server-side packages by default. To prevent issues with VoltAgent, you need to mark its packages as external in your `next.config.mjs` (or `.js` / `.ts`) file:

```typescript title="next.config.mjs // or next.config.ts"
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Mark VoltAgent packages as external
    serverComponentsExternalPackages: ["@voltagent/*"],
    // If using other packages that need to run externally (like npm-check-updates in the example)
    // add them here too.
    // serverComponentsExternalPackages: ["@voltagent/*", "another-package"],
  },
};

export default nextConfig;
```

**Note:** The property was `serverExternalPackages` in older Next.js versions, but changed to `experimental.serverComponentsExternalPackages`. Ensure you use the correct one for your Next.js version.

## Initialize VoltAgent

Create a file to initialize the VoltAgent agent, for example, `voltagent/index.ts` in your project root:

```typescript title="voltagent/index.ts"
import { VoltAgent } from "@voltagent/core";
import { VercelAIManager } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai"; // Or your preferred provider

export const agent = new VoltAgent({
  provider: "vercel-ai", // Specify the Vercel AI provider
  manager: new VercelAIManager({
    model: openai("gpt-4o"), // Configure your desired model
  }),
  functions: [
    // Add any VoltAgent functions/tools here if needed
  ],
});
```

Remember to set up your environment variables (e.g., `OPENAI_API_KEY`) in a `.env.local` file.
Create a `.env.local` file in your project root if it doesn't exist, and add your necessary API keys:

```env title=".env.local"
OPENAI_API_KEY="your-openai-api-key-here"
# Add other environment variables if needed
```

## Create a Server Action

Define a Server Action to interact with the VoltAgent agent. Create `app/actions.ts`:

```typescript title="app/actions.ts"
"use server";

import { agent } from "@/voltagent"; // Adjust path if needed

export async function calculateExpression(expression: string) {
  const result = await agent.generateText(
    `Calculate ${expression}. Only respond with the numeric result.`
  );

  return result.text;
}
```

## Build the UI Component

Create a client component to take user input and display the result. Create `app/components/calculator.tsx`:

```typescript title="app/components/calculator.tsx"
"use client";

import { useState } from "react";
import { calculateExpression } from "../actions";

export function Calculator() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expression, setExpression] = useState("");

  async function handleSubmit(formData: FormData) {
    const expr = formData.get("expression") as string;
    if (!expr.trim()) return;

    setLoading(true);
    try {
      const calcResult = await calculateExpression(expr);
      setResult(calcResult);
      setExpression(expr);
    } catch (error) {
      console.error("Calculation error:", error);
      setResult("Error calculating expression");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>AI Calculator</h2>
      <form action={handleSubmit}>
        <label htmlFor="expression">Enter calculation:</label>
        <input
          id="expression"
          name="expression"
          type="text"
          placeholder="E.g. (5 + 3) * 2"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Calculating..." : "Calculate"}
        </button>
      </form>

      {result && (
        <div>
          <h3>Result:</h3>
          <p>{expression} = {result}</p>
        </div>
      )}
    </div>
  );
}
```

_(Styling omitted for brevity. Refer to the example project for full styling)_

## Use the Component

Finally, import and use the `Calculator` component in your main page (`app/page.tsx`):

```typescript title="app/page.tsx"
import { Calculator } from "./components/calculator";

export default function HomePage() {
  return (
    <main>
      <h1>VoltAgent Next.js Example</h1>
      <Calculator />
    </main>
  );
}
```

Now you can run your Next.js development server (`npm run dev`) and test the AI calculator! This demonstrates a basic integration of VoltAgent within a Next.js application using Server Actions.
