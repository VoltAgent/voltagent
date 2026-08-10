import { type Toolkit, createTool, createToolkit } from "@voltagent/core";
import { z } from "zod";
import type { TenkiSandbox } from "./sandbox";

/**
 * The slice of {@link TenkiSandbox} that {@link createTenkiToolkit} depends on.
 */
export type TenkiToolkitSandbox = Pick<TenkiSandbox, "getSandbox" | "authorizeSshKey">;

/**
 * Build a toolkit of Tenki-specific tools that reach past the
 * `WorkspaceSandbox` seam: exposing a preview URL for a port, and authorizing
 * an SSH public key. Both reuse the adapter's single cached session — preview
 * URLs via {@link TenkiSandbox.getSandbox}, SSH authorization via
 * {@link TenkiSandbox.authorizeSshKey}.
 *
 * These are intentionally separate from the core `execute_command` adapter so a
 * consumer can opt in without them.
 */
export function createTenkiToolkit(sandbox: TenkiToolkitSandbox): Toolkit {
  const exposePreviewUrl = createTool({
    name: "expose_preview_url",
    description:
      "Expose a TCP port inside the Tenki microVM and return a public preview URL. " +
      "Requires the sandbox to allow inbound connections (the default).",
    parameters: z.object({
      port: z
        .number()
        .int()
        .min(1)
        .max(65535)
        .describe("Port inside the sandbox to expose (1-65535, e.g. 3000)"),
      ttlMs: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Optional positive time-to-live for the preview URL, in milliseconds"),
    }),
    outputSchema: z.object({
      previewUrl: z.string().describe("Public URL routing to the exposed port"),
    }),
    execute: async ({ port, ttlMs }) => {
      const session = await sandbox.getSandbox();
      const exposed = await session.exposePort(port, ttlMs === undefined ? undefined : { ttlMs });
      return { previewUrl: exposed.previewUrl };
    },
  });

  const authorizeSshKey = createTool({
    name: "authorize_ssh_key",
    description:
      "Authorize an SSH public key on the Tenki microVM so it can be reached over SSH. " +
      "Additive: keys configured at sandbox creation and keys previously added by this " +
      "tool are preserved. Keys authorized out-of-band via the Tenki SDK are not " +
      "preserved (the SDK cannot read the current key set).",
    parameters: z.object({
      publicKey: z
        .string()
        // `updateSshAuthorizedKeys` would accept a blank or newline-carrying
        // value verbatim; reject obvious non-entries before mutating the set.
        .refine(
          (value) => value.trim().length > 0 && !/[\r\n]/.test(value),
          "publicKey must be a non-empty, single-line authorized_keys entry",
        )
        .describe("SSH public key in authorized_keys format (e.g. 'ssh-ed25519 AAAA... user')"),
    }),
    outputSchema: z.object({
      message: z.string().describe("Human-readable connection hint"),
    }),
    execute: async ({ publicKey }) => {
      const { sessionId } = await sandbox.authorizeSshKey(publicKey);
      return {
        message: `SSH key authorized for session ${sessionId}. Connect with the matching private key.`,
      };
    },
  });

  return createToolkit({
    name: "tenki",
    instructions:
      "Tools for a Tenki microVM sandbox. Use expose_preview_url to get a public URL for a " +
      "server listening on a port inside the sandbox, and authorize_ssh_key to grant SSH access.",
    addInstructions: true,
    tools: [exposePreviewUrl, authorizeSshKey],
  });
}
