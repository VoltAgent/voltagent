import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CompositeFilesystemBackend,
  InMemoryFilesystemBackend,
  NodeFilesystemBackend,
  WorkspaceFilesystem,
} from "../index";

const createBackend = (paths: string[]) =>
  new InMemoryFilesystemBackend(
    Object.fromEntries(
      paths.map((path) => [
        path,
        { content: ["needle"], created_at: "2026-01-01", modified_at: "2026-01-01" },
      ]),
    ),
  );

async function createFilesystem(): Promise<WorkspaceFilesystem> {
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

const rootPaths = [
  "/notes/outside.txt",
  "/notes/sub/deep.txt",
  "/notes2/local.txt",
  "/notes2/shared/team.txt",
  "/notes20/other.txt",
];

const cases: [string, string[]][] = [
  ["/notes2", ["/notes2/local.txt", "/notes2/shared/team.txt"]],
  ["/notes2/", ["/notes2/local.txt", "/notes2/shared/team.txt"]],
  ["notes2", ["/notes2/local.txt", "/notes2/shared/team.txt"]],
  [".", rootPaths],
  ["notes/../notes2", ["/notes2/local.txt", "/notes2/shared/team.txt"]],
  ["notes\\..\\notes2", ["/notes2/local.txt", "/notes2/shared/team.txt"]],
  ["/notes2/./", ["/notes2/local.txt", "/notes2/shared/team.txt"]],
  ["//notes2//", ["/notes2/local.txt", "/notes2/shared/team.txt"]],
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
      if (typeof results === "string") {
        throw new Error(results);
      }
      expect(results).toBeInstanceOf(Array);
      expect(results.map((result) => result.path).sort()).toEqual(expected);
    });
    it.each(["/notes", "/notes/", "notes", "/"])(
      "includes descendant mounts when searching %s",
      async (path) => {
        const filesystem = new WorkspaceFilesystem({
          backend: new CompositeFilesystemBackend(createBackend(["/root.txt"]), {
            "/notes/": createBackend(["/parent.txt"]),
            "/notes/shared/": createBackend(["/child.txt"]),
          }),
        });
        const results =
          method === "grep"
            ? await filesystem.grepRaw("needle", { path })
            : await filesystem.globInfo("**/*.txt", path);
        if (typeof results === "string") throw new Error(results);
        const expected = ["/notes/parent.txt", "/notes/shared/child.txt"];
        if (path === "/") expected.push("/root.txt");
        expect(results.map((result) => result.path).sort()).toEqual(expected);
      },
    );

    it.each(["/", "/notes", "/notes/shared", "/notes/shared/nested"])(
      "excludes shadowed files and duplicates when searching %s",
      async (path) => {
        const filesystem = new WorkspaceFilesystem({
          backend: new CompositeFilesystemBackend(
            createBackend(["/root.txt", "/notes/hidden-default.txt"]),
            {
              "/notes/": createBackend([
                "/parent.txt",
                "/shared/child.txt",
                "/shared/hidden-parent.txt",
              ]),
              "/notes/shared/": createBackend(["/child.txt", "/nested/hidden-child.txt"]),
              "/notes/shared/nested/": createBackend(["/deep.txt"]),
            },
          ),
        });
        const results =
          method === "grep"
            ? await filesystem.grepRaw("needle", { path })
            : await filesystem.globInfo("**/*.txt", path);
        if (typeof results === "string") throw new Error(results);
        const visiblePaths = [
          "/root.txt",
          "/notes/parent.txt",
          "/notes/shared/child.txt",
          "/notes/shared/nested/deep.txt",
        ];
        expect(results.map((result) => result.path).sort()).toEqual(
          visiblePaths.filter((file) => path === "/" || file.startsWith(`${path}/`)).sort(),
        );
      },
    );

    it.each([
      ["/notes", "shared/*.txt", ["/notes/shared/child.txt"]],
      ["/", "notes/shared/*.txt", ["/notes/shared/child.txt"]],
      ["/notes", "*.txt", ["/notes/parent.txt"]],
      [
        "/notes",
        "**/*.txt",
        ["/notes/other/other.txt", "/notes/parent.txt", "/notes/shared/child.txt"],
      ],
      ["/notes", "{shared,other}/*.txt", ["/notes/other/other.txt", "/notes/shared/child.txt"]],
      ["/notes", "shared/!(*.md)", ["/notes/shared/child.txt"]],
    ] as [string, string, string[]][])(
      "matches %s-relative glob %s across descendant mounts",
      async (path, glob, expected) => {
        const filesystem = new WorkspaceFilesystem({
          backend: new CompositeFilesystemBackend(createBackend([]), {
            "/notes/": createBackend(["/parent.txt"]),
            "/notes/shared/": createBackend(["/child.txt", "/guide.md"]),
            "/notes/other/": createBackend(["/other.txt"]),
          }),
        });
        const results =
          method === "grep"
            ? await filesystem.grepRaw("needle", { path, glob })
            : await filesystem.globInfo(glob, path);
        if (typeof results === "string") throw new Error(results);
        expect(results.map((result) => result.path).sort()).toEqual(expected);
      },
    );

    it("resolves dot segments before choosing a native backend", async () => {
      const directory = await mkdtemp(join(tmpdir(), "voltagent-search-"));
      try {
        const defaults = join(directory, "default");
        const notes = join(directory, "notes");
        const other = join(directory, "other");
        await mkdir(join(defaults, "other"), { recursive: true });
        await mkdir(notes, { recursive: true });
        await mkdir(other, { recursive: true });
        await writeFile(join(defaults, "other", "expected.txt"), "needle");
        await writeFile(join(other, "unrelated.txt"), "needle");
        const filesystem = new WorkspaceFilesystem({
          backend: new CompositeFilesystemBackend(
            new NodeFilesystemBackend({ rootDir: defaults }),
            { "/notes/": new NodeFilesystemBackend({ rootDir: notes, contained: false }) },
          ),
        });
        const results =
          method === "grep"
            ? await filesystem.grepRaw("needle", { path: "notes/../other" })
            : await filesystem.globInfo("**/*.txt", "notes/../other");
        if (typeof results === "string") throw new Error(results);
        expect(results.map((result) => result.path)).toEqual(["/other/expected.txt"]);
        const mounted = new WorkspaceFilesystem({
          backend: new CompositeFilesystemBackend(
            new NodeFilesystemBackend({ rootDir: defaults }),
            {
              "/notes/": new NodeFilesystemBackend({ rootDir: notes }),
              "/notes/shared/": new NodeFilesystemBackend({ rootDir: other }),
            },
          ),
        });
        const globResults =
          method === "grep"
            ? await mounted.grepRaw("needle", { path: "/notes", glob: "shared/*.txt" })
            : await mounted.globInfo("shared/*.txt", "/notes");
        if (typeof globResults === "string") throw new Error(globResults);
        expect(globResults.map((result) => result.path)).toEqual(["/notes/shared/unrelated.txt"]);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  });
}
