import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Agent, createTool } from "@voltagent/core";
import sharp from "sharp";
import { z } from "zod";

const creativeBriefAgent = new Agent({
  name: "GeminiCreativeBrief",
  purpose: "Transform product information into rich Instagram creative direction",
  instructions:
    "You take raw product inputs and return an inspiring creative direction for an Instagram ad.",
  model: "google/gemini-2.0-flash-exp",
});

const imageGenerationAgent = new Agent({
  name: "GeminiImageGenerator",
  purpose: "Generate high-converting Instagram visuals",
  instructions:
    "You receive fully prepared prompts and return the best possible Instagram-ready visual output.",
  model: "google/gemini-2.5-flash-image-preview",
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
    try {
      const outputDir = path.join(process.cwd(), "output", "ads", "instagram");
      await fs.mkdir(outputDir, { recursive: true });

      const googleApiKey = process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!googleApiKey) {
        throw new Error(
          "GOOGLE_API_KEY is missing. Set it in your environment to enable Gemini image generation.",
        );
      }

      const audienceContext = targetAudience ? `Target audience: ${targetAudience}.` : "";

      const creativeBriefPrompt = `Create a detailed visual description for a square Instagram advertisement:
        Product: ${productName}
        Tagline: "${tagline}"
        Concept: ${adConcept}
        Style: ${style}
        ${audienceContext}
        Format: Square (1:1 aspect ratio) social media advertisement

        Requirements:
        - Include the product name and tagline prominently
        - Eye-catching and scroll-stopping design
        - Modern design principles with clear visual hierarchy
        - Optimized for Instagram feed
        - Professional commercial quality

        Please describe:
        1. Color palette and visual style
        2. Layout and composition
        3. Typography choices
        4. Key visual elements
        5. Overall mood and atmosphere`;

      const { text: adDescription } = await creativeBriefAgent.generateText(creativeBriefPrompt, {
        temperature: 0.5,
        maxRetries: 2,
      });

      const imagePrompt = `Design a high-converting square Instagram advertisement for ${productName}.

Brand context:
- Tagline: ${tagline}
- Core concept: ${adConcept}
- Visual style: ${style}
${audienceContext ? `- ${audienceContext}` : ""}

Incorporate this strategic creative direction:
${adDescription}

Critical requirements:
- Treat the provided reference image as the single source of visual truth.
- Base layout, palette, product framing, and hero imagery directly on the reference.
- Do not introduce new scenes or fictional elements—refine what exists in the reference so it feels Instagram-ready.`;

      const userContent: (
        | { type: "text"; text: string }
        | {
            type: "image";
            image: Buffer | Uint8Array | string;
            mediaType?: string;
          }
      )[] = [{ type: "text", text: imagePrompt }];
      const screenshotPathValue = context?.context.get("screenshotPath");

      if (typeof screenshotPathValue === "string") {
        try {
          const screenshotBuffer = await fs.readFile(screenshotPathValue);
          const metadata = await sharp(screenshotBuffer).metadata();
          const width = metadata.width ?? 0;
          const height = metadata.height ?? 0;
          let processedScreenshot: Buffer;
          if (!width || !height) {
            processedScreenshot = await sharp(screenshotBuffer)
              .resize(1024, 1024, { fit: "cover" })
              .png()
              .toBuffer();
          } else {
            const cropSize = Math.min(width, height);
            const left = width > cropSize ? Math.floor((width - cropSize) / 2) : 0;
            processedScreenshot = await sharp(screenshotBuffer)
              .extract({
                left,
                top: 0,
                width: cropSize,
                height: cropSize,
              })
              .resize(1024, 1024)
              .png()
              .toBuffer();
          }

          const referenceDir = path.join(process.cwd(), "output", "references");
          await fs.mkdir(referenceDir, { recursive: true });
          const referenceFilename = `reference_${Date.now()}.png`;
          const referencePath = path.join(referenceDir, referenceFilename);
          await fs.writeFile(referencePath, processedScreenshot);

          userContent.push({
            type: "image",
            image: processedScreenshot,
            mediaType: "image/png",
          });

          context?.context.set("referenceImagePath", referencePath);
        } catch (screenshotError) {
          console.warn(
            `Unable to process screenshot at ${screenshotPathValue}. Continuing without reference image.`,
            screenshotError,
          );
        }
      }

      const imageResult = await imageGenerationAgent.generateText(
        [
          {
            role: "user",
            content: userContent,
          },
        ],
        {
          providerOptions: {
            google: {
              responseModalities: ["IMAGE"],
            },
          },
          temperature: 0.3,
          maxRetries: 2,
        },
      );

      const firstFile = imageResult.files[0];

      if (!firstFile) {
        throw new Error("Gemini did not return image data");
      }

      const buffer = Buffer.from(firstFile.base64, "base64");
      const timestamp = Date.now();
      const safeName =
        productName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "") || "brand";
      const filename = `instagram_${safeName}_${timestamp}.png`;
      const filepath = path.join(outputDir, filename);

      await fs.writeFile(filepath, buffer);

      console.log(`Instagram ad generated with Gemini: ${filepath}`);

      context?.context.set("instagramAdPath", filepath);
      context?.context.set("instagramAdPrompt", imagePrompt);

      const relativePath = path.relative(process.cwd(), filepath).replace(/\\+/g, "/");
      const baseUrl =
        process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? "3141"}`;
      const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      const publicUrl = new URL(relativePath, normalizedBaseUrl).toString();

      return {
        success: true,
        publicUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate Instagram ad with Gemini: ${errorMessage}`);
    }
  },
});
