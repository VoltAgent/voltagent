import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { google } from "@ai-sdk/google";
import { Agent, createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

async function listAllFiles(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const collected = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return await listAllFiles(fullPath);
      }
      return fullPath;
    }),
  );
  return collected.flat();
}

const testWritingAgent = new Agent({
  name: "test-writer",
  instructions:
    "Generate TypeScript unit tests for provided code. Prefer Vitest/Jest syntax as applicable.",
  model: google("gemini-2.0-flash-exp"),
});

export const writeTests = createWorkflowChain({
  id: "write-tests",
  name: "Write Unit Tests Workflow",
  purpose: "Discover files that need test coverage, and write tests for them.",
  input: z.object({}),
  result: z.boolean(),
  // Default resume schema
  resumeSchema: z.object({ continue: z.boolean() }),
})
  .andThen({
    id: "list-files-step",
    execute: async () => {
      try {
        // Get all files directly without agent
        const allFiles = await listAllFiles(join(process.cwd(), "src"));
        console.log(`[write-tests] Scanned files: ${allFiles.length}`);

        // Filter for .tsx files that don't have corresponding .test.tsx files
        const filesWithoutTests = allFiles.filter((file) => {
          // Must be a .tsx file
          if (!file.endsWith(".tsx")) return false;

          // Must not be a test file itself
          if (file.endsWith(".test.tsx")) return false;

          // Check if corresponding test file exists
          const testFilePath = file.replace(".tsx", ".test.tsx");
          const hasTestFile = allFiles.includes(testFilePath);

          return !hasTestFile;
        });
        console.log(`[write-tests] Candidates without tests: ${filesWithoutTests.length}`);

        return {
          result: filesWithoutTests,
        };
      } catch (error) {
        console.error("---------------- list-files-step error: ", error);
      }
    },
  })

  .andThen({
    id: "read-file-contents-step",
    execute: async ({ data }) => {
      try {
        const targetPath = `${data?.result[0]}`;
        console.log(`[write-tests] Reading file: ${targetPath}`);

        // Read file directly without agent
        const fileContents = await readFile(targetPath, {
          encoding: "utf8",
        });
        console.log(`[write-tests] Read ${fileContents.length} characters from: ${targetPath}`);

        return {
          fileName: targetPath,
          fileContents: fileContents,
        };
      } catch (error) {
        console.error("---------------- read-file-contents-step error: ", error);
      }
    },
  })

  .andThen({
    id: "generate-test-code-step",
    execute: async ({ data }) => {
      try {
        console.log(`[write-tests] Generating test code for: ${data?.fileName}`);
        const response = await testWritingAgent.generateText(
          `Write a unit test for the below code:

        <code>
        ${data?.fileContents}
        </code>

        `,
        );
        console.log(`[write-tests] Generated test code length: ${response.text.length}`);

        return {
          fileName: data?.fileName.replace(/.tsx$/, ".test.tsx"),
          testCode: response.text,
        };
      } catch (error) {
        console.error("---------------- generate-test-code-step error: ", error);
      }
    },
  })

  .andThen({
    id: "write-test-file-step",
    execute: async ({ data }) => {
      const { fileName, testCode } = (data ?? {}) as {
        fileName?: string;
        testCode?: string;
      };

      if (!fileName || !testCode) {
        throw new Error("Missing generated test output: fileName or testCode");
      }

      // Clean up the test code (remove code fence markers if present)
      const contentsToWrite = testCode
        .replace(/^```typescript\n/, "")
        .replace(/^```tsx\n/, "")
        .replace(/^```ts\n/, "")
        .replace(/\n```$/, "");

      // Write file directly without agent
      console.log(`[write-tests] Writing test file: ${fileName}`);
      await writeFile(fileName, contentsToWrite, {
        flag: "w+",
      });
      console.log(`[write-tests] Wrote test file: ${fileName}`);

      return {
        result: true,
      };
    },
  });
