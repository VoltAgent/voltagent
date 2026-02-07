import { describe, expect, it, vi } from "vitest";
import { Workspace } from "..";
import type { FileData } from "../filesystem";

describe("WorkspaceSkills root resolver context", () => {
  it("provides workspace identity and filesystem to the resolver", async () => {
    const resolver = vi.fn(async () => ["/skills"]);
    const workspace = new Workspace({
      id: "workspace-ctx",
      skills: {
        rootPaths: resolver,
      },
    });

    await workspace.skills?.discoverSkills();

    expect(resolver).toHaveBeenCalledTimes(1);
    const context = resolver.mock.calls[0]?.[0];
    expect(context?.workspace.id).toBe("workspace-ctx");
    expect(context?.filesystem).toBe(workspace.filesystem);
  });
});

describe("WorkspaceSkills discovery and activation", () => {
  it("discovers, loads, and activates skills", async () => {
    const skillContent = `---
name: Data Analyst
description: Analyze CSV data
version: "1.0.0"
tags:
  - data
---
Analyze the files and summarize findings.`;

    const timestamp = new Date().toISOString();
    const skillFile: FileData = {
      content: skillContent.split("\n"),
      created_at: timestamp,
      modified_at: timestamp,
    };

    const workspace = new Workspace({
      filesystem: {
        files: {
          "/skills/data/SKILL.md": skillFile,
        },
      },
      skills: {
        rootPaths: ["/skills"],
        autoDiscover: false,
      },
    });

    const skills = await workspace.skills?.discoverSkills();
    expect(skills?.length).toBe(1);
    expect(skills?.[0]?.id).toBe("/skills/data");

    const detail = await workspace.skills?.loadSkill("/skills/data");
    expect(detail?.instructions).toContain("Analyze the files");

    const activated = await workspace.skills?.activateSkill("Data Analyst");
    expect(activated?.id).toBe("/skills/data");
    expect(workspace.skills?.getActiveSkills().length).toBe(1);

    const deactivated = await workspace.skills?.deactivateSkill("/skills/data");
    expect(deactivated).toBe(true);
    expect(workspace.skills?.getActiveSkills().length).toBe(0);
  });
});

describe("WorkspaceSkills file access", () => {
  it("allows listed reference files and blocks others", async () => {
    const timestamp = new Date().toISOString();
    const skillContent = `---
name: Data Analyst
references:
  - references/schema.md
---
Use the schema reference.`;

    const skillFile = {
      content: skillContent.split("\n"),
      created_at: timestamp,
      modified_at: timestamp,
    };

    const referenceFile = {
      content: ["table: customers"],
      created_at: timestamp,
      modified_at: timestamp,
    };

    const workspace = new Workspace({
      filesystem: {
        files: {
          "/skills/data/SKILL.md": skillFile,
          "/skills/data/references/schema.md": referenceFile,
        },
      },
      skills: {
        rootPaths: ["/skills"],
        autoDiscover: false,
      },
    });

    const toolkit = workspace.createSkillsToolkit();
    const tool = toolkit.tools.find((entry) => entry.name === "workspace_read_skill_reference");
    if (!tool?.execute) {
      throw new Error("workspace_read_skill_reference tool not found");
    }

    const executeOptions = {
      systemContext: new Map(),
      abortController: new AbortController(),
    } as any;

    const allowed = await tool.execute(
      { skill_id: "/skills/data", reference: "references/schema.md" },
      executeOptions,
    );
    expect(String(allowed)).toContain("table: customers");

    const blocked = await tool.execute(
      { skill_id: "/skills/data", reference: "secrets.txt" },
      executeOptions,
    );
    expect(String(blocked)).toContain("File not allowed");
  });

  it("allows listed scripts/assets with normalized paths and blocks traversal", async () => {
    const timestamp = new Date().toISOString();
    const skillContent = `---
name: Script Runner
scripts:
  - scripts/run.sh
  - scripts\\windows.ps1
assets:
  - assets/input.csv
---
Use the scripts and assets.`;

    const makeFile = (content: string): FileData => ({
      content: content.split("\n"),
      created_at: timestamp,
      modified_at: timestamp,
    });

    const workspace = new Workspace({
      filesystem: {
        files: {
          "/skills/runner/SKILL.md": makeFile(skillContent),
          "/skills/runner/scripts/run.sh": makeFile("echo run"),
          "/skills/runner/scripts/windows.ps1": makeFile("Write-Host run"),
          "/skills/runner/assets/input.csv": makeFile("id,name\n1,alpha"),
        },
      },
      skills: {
        rootPaths: ["/skills"],
        autoDiscover: false,
      },
    });

    const toolkit = workspace.createSkillsToolkit();
    const readScriptTool = toolkit.tools.find(
      (tool) => tool.name === "workspace_read_skill_script",
    );
    const readAssetTool = toolkit.tools.find((tool) => tool.name === "workspace_read_skill_asset");
    if (!readScriptTool?.execute || !readAssetTool?.execute) {
      throw new Error("Workspace skill read tools not found");
    }

    const executeOptions = {
      systemContext: new Map(),
      abortController: new AbortController(),
    } as any;

    const scriptOutput = await readScriptTool.execute(
      { skill_id: "/skills/runner", script: "scripts/run.sh" },
      executeOptions,
    );
    expect(String(scriptOutput)).toContain("echo run");

    const normalizedOutput = await readScriptTool.execute(
      { skill_id: "/skills/runner", script: "scripts/windows.ps1" },
      executeOptions,
    );
    expect(String(normalizedOutput)).toContain("Write-Host run");

    const assetOutput = await readAssetTool.execute(
      { skill_id: "/skills/runner", asset: "assets/input.csv" },
      executeOptions,
    );
    expect(String(assetOutput)).toContain("id,name");

    const blocked = await readAssetTool.execute(
      { skill_id: "/skills/runner", asset: "../secret.txt" },
      executeOptions,
    );
    expect(String(blocked)).toContain("File not allowed");
  });
});

describe("WorkspaceSkills search", () => {
  it("returns BM25 search results with snippets", async () => {
    const timestamp = new Date().toISOString();
    const makeFile = (content: string) => ({
      content: content.split("\n"),
      created_at: timestamp,
      modified_at: timestamp,
    });

    const workspace = new Workspace({
      filesystem: {
        files: {
          "/skills/data/SKILL.md": makeFile(`---
name: Data Analyst
---
Analyze CSV files and produce charts.`),
          "/skills/code/SKILL.md": makeFile(`---
name: Code Helper
---
Review TypeScript and suggest fixes.`),
        },
      },
      skills: {
        rootPaths: ["/skills"],
        autoDiscover: false,
      },
    });

    const results = await workspace.skills?.search("csv", { mode: "bm25" });
    expect(results?.[0]?.name).toBe("Data Analyst");
    expect(results?.[0]?.snippet).toContain("CSV");
  });
});
