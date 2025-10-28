# Awesome Claude Skills

> A curated collection of Claude Skills from Anthropic and the community

## Introduction

Claude Skills are folders that contain instructions, scripts, and resources. Each skill teaches Claude how to perform a specific task. Skills can include executable code that runs during task execution.

Claude scans available skills and loads only what it needs for the current task. This design allows you to maintain hundreds of skills without performance impact.

### How Skills Work

**Composition**
Skills use markdown files and folders. If you can write documentation, you can create a skill.

**Loading Behavior**
Claude scans available skills and loads only what the current task requires. Multiple skills can run simultaneously.

**Distribution**
A skill is a folder. Copy it to share it. The format works across all Claude platforms.

**Execution**
Skills can include code that runs during task completion. This provides more reliable results than instructions alone.

### Use Cases

Skills can handle document creation (Excel, PowerPoint, Word), brand guideline enforcement, code testing, deployment workflows, pull request reviews, and data analysis. Multiple skills can run together for complex tasks.

### Requirements

Skills require a Pro, Max, Team, or Enterprise subscription. Enable them in Claude settings. API usage requires the Code Execution Tool beta.

### Security

Skills can execute code on your system. Review skills before use and only install from trusted sources. Treat skills like any other software you install.

### Creating a Skill

**Requirements**

- A folder with a `Skill.md` file
- YAML frontmatter: `name` (max 64 chars), `` (max 200 chars)
- Optional: `version`, `dependencies`

**File Structure**

```markdown
---
name: api-tester
: Test REST APIs and validate responses
version: 1.0.0
---

# API Tester

Test HTTP endpoints and validate response structures.

## When to Use This Skill

Use this skill when you need to test API endpoints and verify response data.

## Instructions

When testing an API:

1. Send a request to the specified endpoint
2. Check the response status code
3. Validate the response body structure
4. Report any errors or unexpected results

## Response Validation

- Verify required fields exist
- Check data types match expected values
- Confirm nested objects have correct structure
```

See the [template-skill](https://github.com/anthropics/skills/tree/main/template-skill) and [creation guide](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills) for more details.

**Packaging**

To distribute:

1. Folder name must match the skill name
2. Create a ZIP file with the skill folder as root
3. Verify all referenced files exist in the package

**Best Practices**

- Focus on specific, repeatable tasks
- Include context for when Claude should use the skill
- Add example inputs and outputs
- Avoid hardcoding sensitive information
- Test incrementally

### About This Collection

This repository collects Claude Skills from Anthropic and the community. Use it to find skills or as inspiration for creating your own.

---

## Official Claude Skills

### Document Creation

| Skill                                                           |                                                                                                                                  | Description                                        |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [**docx**](https://github.com/anthropics/skills/tree/main/docx) | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/docx) | Create, edit, and analyze Word documents           |
| [**pptx**](https://github.com/anthropics/skills/tree/main/pptx) | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/pptx) | Create, edit, and analyze PowerPoint presentations |
| [**xlsx**](https://github.com/anthropics/skills/tree/main/xlsx) | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/xlsx) | Create, edit, and analyze Excel spreadsheets       |
| [**pdf**](https://github.com/anthropics/skills/tree/main/pdf)   | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/pdf)  | Extract text, create PDFs, and handle forms        |

### Creative and Design

| Skill                                                                                     |                                                                                                                                               | Description                                                        |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [**algorithmic-art**](https://github.com/anthropics/skills/tree/main/algorithmic-art)     | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/algorithmic-art)   | Create generative art using p5.js with seeded randomness           |
| [**canvas-design**](https://github.com/anthropics/skills/tree/main/canvas-design)         | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/canvas-design)     | Design visual art in PNG and PDF formats                           |
| [**slack-gif-creator**](https://github.com/anthropics/skills/tree/main/slack-gif-creator) | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/slack-gif-creator) | Create animated GIFs optimized for Slack size constraints          |
| [**theme-factory**](https://github.com/anthropics/skills/tree/main/theme-factory)         | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/theme-factory)     | Style artifacts with professional themes or generate custom themes |

### Development

| Skill                                                                                     |                                                                                                                                               | Description                                                    |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [**artifacts-builder**](https://github.com/anthropics/skills/tree/main/artifacts-builder) | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/artifacts-builder) | Build complex claude.ai HTML artifacts with React and Tailwind |
| [**mcp-builder**](https://github.com/anthropics/skills/tree/main/mcp-builder)             | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/mcp-builder)       | Create MCP servers to integrate external APIs and services     |
| [**webapp-testing**](https://github.com/anthropics/skills/tree/main/webapp-testing)       | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/webapp-testing)    | Test local web applications using Playwright                   |

### Branding and Communication

| Skill                                                                                   |                                                                                                                                              | Description                                                |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [**brand-guidelines**](https://github.com/anthropics/skills/tree/main/brand-guidelines) | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/brand-guidelines) | Apply Anthropic's brand colors and typography to artifacts |
| [**internal-comms**](https://github.com/anthropics/skills/tree/main/internal-comms)     | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/internal-comms)   | Write status reports, newsletters, and FAQs                |

### Meta

| Skill                                                                               |                                                                                                                                            | Description                                                 |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| [**skill-creator**](https://github.com/anthropics/skills/tree/main/skill-creator)   | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/skill-creator)  | Guide for creating skills that extend Claude's capabilities |
| [**template-skill**](https://github.com/anthropics/skills/tree/main/template-skill) | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/anthropics/skills/tree/main/template-skill) | Basic template for creating new skills                      |

## Community Skills

### Productivity and Collaboration

| Skill                                                                                                                      |                                                                                                                                                                       | Description                                            |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [**Notion Skills for Claude**](https://www.notion.so/notiondevs/Notion-Skills-for-Claude-28da4445d27180c7af1df7d8615723d0) | -                                                                                                                                                                     | Skills for working with Notion                         |
| [**superpowers-lab**](https://github.com/obra/superpowers-lab)                                                             | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers-lab)                                                  | Lab environment for Claude superpowers                 |
| [**brainstorming**](https://github.com/obra/superpowers/tree/main/skills/brainstorming)                                    | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers/tree/main/skills/brainstorming)                       | Generate and explore ideas                             |
| [**writing-plans**](https://github.com/obra/superpowers/tree/main/skills/writing-plans)                                    | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers/tree/main/skills/writing-plans)                       | Create strategic documentation                         |
| [**executing-plans**](https://github.com/obra/superpowers/tree/main/skills/executing-plans)                                | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers/tree/main/skills/executing-plans)                     | Implement and run strategic plans                      |
| [**dispatching-parallel-agents**](https://github.com/obra/superpowers/tree/main/skills/dispatching-parallel-agents)        | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers/tree/main/skills/dispatching-parallel-agents)         | Coordinate multiple simultaneous agents                |
| [**sharing-skills**](https://github.com/obra/superpowers/tree/main/skills/sharing-skills)                                  | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers/tree/main/skills/sharing-skills)                      | Distribute and communicate capabilities                |
| [**using-superpowers**](https://github.com/obra/superpowers/tree/main/skills/using-superpowers)                            | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers/tree/main/skills/using-superpowers)                   | Leverage core platform capabilities                    |
| [**csv-data-summarizer**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/csv-data-summarizer)               | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/csv-data-summarizer)        | Analyze and visualize CSV files (by ComposioHQ)        |
| [**domain-name-brainstormer**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/domain-name-brainstormer)     | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/domain-name-brainstormer)   | Generate and check domain ideas (by ComposioHQ)        |
| [**lead-research-assistant**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/lead-research-assistant)       | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/lead-research-assistant)    | Identify and qualify business leads (by ComposioHQ)    |
| [**article-extractor**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/article-extractor)                   | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/article-extractor)          | Extract web article content (by ComposioHQ)            |
| [**content-research-writer**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/content-research-writer)       | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/content-research-writer)    | Enhance writing with research (by ComposioHQ)          |
| [**meeting-insights-analyzer**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/meeting-insights-analyzer)   | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/meeting-insights-analyzer)  | Analyze meeting communication patterns (by ComposioHQ) |
| [**competitive-ads-extractor**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/competitive-ads-extractor)   | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/competitive-ads-extractor)  | Analyze competitor advertising (by ComposioHQ)         |
| [**family-history-research**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/family-history-research)       | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/family-history-research)    | Genealogy research assistance (by ComposioHQ)          |
| [**notebooklm-integration**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/notebooklm-integration)         | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/notebooklm-integration)     | Source-based document interaction (by ComposioHQ)      |
| [**markdown-to-epub-converter**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/markdown-to-epub-converter) | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/markdown-to-epub-converter) | Convert markdown to ebook format (by ComposioHQ)       |
| [**image-enhancer**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/image-enhancer)                         | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/image-enhancer)             | Improve image quality (by ComposioHQ)                  |

### Development and Testing

| Skill                                                                                                                     |                                                                                                                                                                    | Description                                               |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| [**ios-simulator-skill**](https://github.com/conorluddy/ios-simulator-skill)                                              | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/conorluddy/ios-simulator-skill)                                     | Control iOS Simulator (also by ComposioHQ)                |
| [**ffuf-claude-skill**](https://github.com/jthack/ffuf_claude_skill)                                                      | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/jthack/ffuf_claude_skill)                                           | Web fuzzing with ffuf (also by ComposioHQ)                |
| [**playwright-skill**](https://github.com/lackeyjb/playwright-skill)                                                      | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/lackeyjb/playwright-skill)                                          | Browser automation with Playwright (also by ComposioHQ)   |
| [**test-driven-development**](https://github.com/obra/superpowers/tree/main/skills/test-driven-development)               | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                                                   | Write tests before implementing code (also by ComposioHQ) |
| [**aws-skills**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/aws-skills)                                | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/aws-skills)              | AWS development and architecture patterns (by ComposioHQ) |
| [**changelog-generator**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/changelog-generator)              | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/changelog-generator)     | Transform git commits into release notes (by ComposioHQ)  |
| [**d3js-visualization**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/d3js-visualization)                | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/d3js-visualization)      | Generate interactive data charts (by ComposioHQ)          |
| [**move-code-quality-skill**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/move-code-quality-skill)      | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/move-code-quality-skill) | Analyze Move language code quality (by ComposioHQ)        |
| [**pypict-claude-skill**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/pypict-claude-skill)              | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/pypict-claude-skill)     | Generate comprehensive test cases (by ComposioHQ)         |
| [**skill-seekers**](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/skill-seekers)                          | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/ComposioHQ/awesome-claude-skills/tree/main/skill-seekers)           | Convert documentation to Claude skills (by ComposioHQ)    |
| [**subagent-driven-development**](https://github.com/obra/superpowers/tree/main/skills/subagent-driven-development)       | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                                                   | Development using multiple sub-agents                     |
| [**systematic-debugging**](https://github.com/obra/superpowers/tree/main/skills/systematic-debugging)                     | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                                                   | Methodical problem-solving in code                        |
| [**root-cause-tracing**](https://github.com/obra/superpowers/tree/main/skills/root-cause-tracing)                         | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                                                   | Investigate and identify fundamental problems             |
| [**testing-skills-with-subagents**](https://github.com/obra/superpowers/tree/main/skills/testing-skills-with-subagents)   | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                                                   | Collaborative testing approaches                          |
| [**testing-anti-patterns**](https://github.com/obra/superpowers/tree/main/skills/testing-anti-patterns)                   | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                                                   | Identify ineffective testing practices                    |
| [**finishing-a-development-branch**](https://github.com/obra/superpowers/tree/main/skills/finishing-a-development-branch) | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                                                   | Complete Git code branches                                |
| [**requesting-code-review**](https://github.com/obra/superpowers/tree/main/skills/requesting-code-review)                 | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                                                   | Initiate code review processes                            |
| [**receiving-code-review**](https://github.com/obra/superpowers/tree/main/skills/receiving-code-review)                   | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                                                   | Process and incorporate code feedback                     |
| [**using-git-worktrees**](https://github.com/obra/superpowers/tree/main/skills/using-git-worktrees)                       | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                                                   | Manage multiple Git working trees                         |
| [**verification-before-completion**](https://github.com/obra/superpowers/tree/main/skills/verification-before-completion) | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                                                   | Validate work before finalizing                           |
| [**condition-based-waiting**](https://github.com/obra/superpowers/tree/main/skills/condition-based-waiting)               | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                                                   | Manage conditional pauses or delays                       |
| [**commands**](https://github.com/obra/superpowers/tree/main/skills/commands)                                             | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                                                   | Create and manage command structures                      |
| [**writing-skills**](https://github.com/obra/superpowers/tree/main/skills/writing-skills)                                 | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                                                   | Develop and document capabilities                         |

### Specialized Domains

| Skill                                                                                                   |                                                                                                                                             | Description                             |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| [**claude-scientific-skills**](https://github.com/K-Dense-AI/claude-scientific-skills)                  | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/K-Dense-AI/claude-scientific-skills)         | Scientific research and analysis skills |
| [**claude-win11-speckit-update-skill**](https://github.com/NotMyself/claude-win11-speckit-update-skill) | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/NotMyself/claude-win11-speckit-update-skill) | Windows 11 system management            |
| [**claudisms**](https://github.com/jeffersonwarrior/claudisms)                                          | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/jeffersonwarrior/claudisms)                  | SMS messaging integration               |
| [**defense-in-depth**](https://github.com/obra/superpowers/tree/main/skills/defense-in-depth)           | [![Source Code](https://img.shields.io/badge/source-code-blue?logo=github)](https://github.com/obra/superpowers)                            | Multi-layered security approaches       |

## Articles and Tutorials

### 📚 Official

- [Claude Skills Quickstart](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/quickstart) - Get started with Claude Skills
- [Claude Skills Best Practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices) - Best practices for creating skills
- [Skills Cookbook](https://github.com/anthropics/claude-cookbooks/blob/main/skills/README.md) - Skills examples and guides
- [What Are Skills](https://support.claude.com/en/articles/12512176-what-are-skills) - Introduction to Claude Skills
- [Using Skills in Claude](https://support.claude.com/en/articles/12512180-using-skills-in-claude) - How to use skills in Claude
- [How to Create Custom Skills](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills) - Step-by-step guide to creating skills
- [Create a Skill Through Conversation](https://support.claude.com/en/articles/12599426-how-to-create-a-skill-with-claude-through-conversation) - Create skills by talking to Claude
- [Claude for Financial Services Skills](https://support.claude.com/en/articles/12663107-claude-for-financial-services-skills) - Industry-specific skills for financial services
- [Equipping Agents for the Real World with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) - Technical deep dive into agent skills
- [Teach Claude Your Way of Working](https://support.claude.com/en/articles/12580051-teach-claude-your-way-of-working-using-skills) - Customize Claude with your workflow

### 👥 Community

- [Simon Willison: Claude Skills](https://simonwillison.net/2025/Oct/16/claude-skills/) - Introduction to Claude Skills
- [Nick Nisi: Claude Skills](https://nicknisi.com/posts/claude-skills/) - Getting started with Claude Skills
- [Young Leaders: Claude Skills, Commands, Subagents, Plugins](https://www.youngleaders.tech/p/claude-skills-commands-subagents-plugins) - Comparison of Claude features

### 🎥 Videos

- [Claude Skills Tutorial](https://www.youtube.com/watch?v=421T2iWTQio)
- [Getting Started with Claude Skills](https://www.youtube.com/watch?v=G-5bInklwRQ)
- [Building Custom Skills](https://www.youtube.com/watch?v=46zQX7PSHfU)
- [Claude Skills Deep Dive](https://www.youtube.com/watch?v=IoqpBKrNaZI)
- [Skills in Practice](https://www.youtube.com/watch?v=QpGWaWH1DxY)
- [Advanced Skill Patterns](https://www.youtube.com/watch?v=WKFFFumnzYI)
- [Skill Development Workflow](https://www.youtube.com/watch?v=FOqbS_llAms)
- [Real-World Skills Examples](https://www.youtube.com/watch?v=v1y5EUSQ8WA)
- [Skill Best Practices](https://www.youtube.com/watch?v=M8yaR-wNGj0)
- [Skills Integration Guide](https://www.youtube.com/watch?v=MZZCW179nKM)

## Contributing

To add a skill, submit a pull request with:

- Skill name and
- Repository or download link

---

## Resources

- [Official Claude Skills Announcement](https://www.anthropic.com/news/skills)
- [Claude Skills Documentation](https://docs.anthropic.com/)
- [Official Skills Examples (GitHub)](https://github.com/anthropics/claude-skills)

## License

This collection is [CC0](https://creativecommons.org/publicdomain/zero/1.0/) - free to use however you want.
