import { describe, expect, it } from "vitest";
import {
  CompositeFilesystemBackend,
  InMemoryFilesystemBackend,
  WorkspaceFilesystem,
} from "../index";

async function createFilesystem(): Promise<WorkspaceFilesystem> {
  const createBackend = (paths: string[]) =>
    new InMemoryFilesystemBackend(
      Object.fromEntries(
        paths.map((path) => [
          path,
          { content: ["needle"], created_at: "2026-01-01", modified_at: "2026-01-01" },
        ]),
      ),
    );
  const defaults = createBackend(["/notes2/local.txt", "/notes20/default.txt"]);
  const notes = createBackend(["/outside.txt", "/sub/deep.txt"]);
  const shared = createBackend(["/team.txt"]);
  const archive = createBackend(["/other.txt"]);
  return new WorkspaceFilesystem({
    backend: new CompositeFilesystemBackend(defaults, {
      "/notes/": notes,
      "/notes2/shared/": shared,
      "/notes20/": archive,
    }),
  });
}

const cases: [string, string[]][] = [
  ["/notes2", ["/notes2/local.txt", "/notes2/shared/team.txt"]],
  ["/notes2/", ["/notes2/local.txt", "/notes2/shared/team.txt"]],
  ["notes2", ["/notes2/local.txt", "/notes2/shared/team.txt"]],
  ["   ", []],
  ["/missing", []],
  ["/notes", ["/notes/outside.txt", "/notes/sub/deep.txt"]],
  ["/notes/sub", ["/notes/sub/deep.txt"]],
  [
    "/",
    [
      "/notes/outside.txt",
      "/notes/sub/deep.txt",
      "/notes2/local.txt",
      "/notes2/shared/team.txt",
      "/notes20/default.txt",
      "/notes20/other.txt",
    ],
  ],
];

for (const method of ["grep", "glob"] as const) {
  describe(`${method} with mounted filesystems`, () => {
    it.each(cases)("limits results to %s", async (path, expected) => {
      const filesystem = await createFilesystem();
      const results =
        method === "grep"
          ? await filesystem.grepRaw("needle", { path })
          : await filesystem.globInfo("**/*.txt", path);
      expect(results).toBeInstanceOf(Array);
      if (typeof results === "string") {
        throw new Error(results);
      }
      expect(results.map((result) => result.path).sort()).toEqual(expected);
    });
  });
}
