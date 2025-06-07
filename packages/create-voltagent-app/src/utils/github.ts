import { promises as fs, createWriteStream } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import tar from "tar";

const TEMP_PREFIX = ".voltagent-github.temp";

/**
 * Checks if a path exists in a GitHub repository
 */
export const existsInRepo = async ({
  path,
  branch = "main",
}: {
  path: string;
  branch?: string;
}): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/voltagent/voltagent/contents/examples/${encodeURIComponent(path)}?ref=${branch}`,
    );
    return response.status === 200;
  } catch {
    return false;
  }
};

/**
 * Downloads a tar file from GitHub
 */
const downloadTar = async (url: string): Promise<string | undefined> => {
  const tempFile = join(process.cwd(), `${TEMP_PREFIX}-${Date.now()}`);
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download from ${url}`);
    }

    const fileStream = createWriteStream(tempFile);
    const buffer = await response.arrayBuffer();
    const readable = Readable.from(Buffer.from(buffer));

    await pipeline(readable, fileStream);
    return tempFile;
  } catch {
    try {
      await fs.unlink(tempFile);
    } catch {
      // ignore
    }
    return undefined;
  }
};

/**
 * Downloads and extracts a specific example from voltagent repository
 */
export const downloadExample = async ({
  targetDir,
  example,
  branch = "main",
  stripComponents = 3, // Strip voltagent-main/examples/example-name by default
}: {
  targetDir: string;
  example: string;
  branch?: string;
  stripComponents?: number;
}): Promise<"download-failed" | "extract-failed" | "success"> => {
  const tempFile = await downloadTar(
    `https://codeload.github.com/voltagent/voltagent/tar.gz/${branch}`,
  );

  if (!tempFile) {
    return "download-failed";
  }

  try {
    await tar.x({
      file: tempFile,
      cwd: targetDir,
      strip: stripComponents,
      filter: (p: string) => {
        const relativePath = `voltagent-${branch}/examples/${example}/`;
        if (p.includes(relativePath)) {
          return true;
        }
        return false;
      },
    });
  } catch {
    try {
      await fs.unlink(tempFile);
    } catch {
      // ignore
    }
    return "extract-failed";
  }

  try {
    await fs.unlink(tempFile);
  } catch {
    // ignore
  }

  return "success";
};
