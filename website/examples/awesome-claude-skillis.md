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
- YAML frontmatter: `name` (max 64 chars), `description` (max 200 chars)
- Optional: `version`, `dependencies`

**File Structure**

```markdown
---
name: api-tester
description: Test REST APIs and validate responses
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

| Skill                                                           | Description                                        |
| --------------------------------------------------------------- | -------------------------------------------------- |
| [**docx**](https://github.com/anthropics/skills/tree/main/docx) | Create, edit, and analyze Word documents           |
| [**pptx**](https://github.com/anthropics/skills/tree/main/pptx) | Create, edit, and analyze PowerPoint presentations |
| [**xlsx**](https://github.com/anthropics/skills/tree/main/xlsx) | Create, edit, and analyze Excel spreadsheets       |
| [**pdf**](https://github.com/anthropics/skills/tree/main/pdf)   | Extract text, create PDFs, and handle forms        |

### Creative and Design

| Skill                                                                                     | Description                                                        |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [**algorithmic-art**](https://github.com/anthropics/skills/tree/main/algorithmic-art)     | Create generative art using p5.js with seeded randomness           |
| [**canvas-design**](https://github.com/anthropics/skills/tree/main/canvas-design)         | Design visual art in PNG and PDF formats                           |
| [**slack-gif-creator**](https://github.com/anthropics/skills/tree/main/slack-gif-creator) | Create animated GIFs optimized for Slack size constraints          |
| [**theme-factory**](https://github.com/anthropics/skills/tree/main/theme-factory)         | Style artifacts with professional themes or generate custom themes |

### Development

| Skill                                                                                     | Description                                                    |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [**artifacts-builder**](https://github.com/anthropics/skills/tree/main/artifacts-builder) | Build complex claude.ai HTML artifacts with React and Tailwind |
| [**mcp-builder**](https://github.com/anthropics/skills/tree/main/mcp-builder)             | Create MCP servers to integrate external APIs and services     |
| [**webapp-testing**](https://github.com/anthropics/skills/tree/main/webapp-testing)       | Test local web applications using Playwright                   |

### Branding and Communication

| Skill                                                                                   | Description                                                |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [**brand-guidelines**](https://github.com/anthropics/skills/tree/main/brand-guidelines) | Apply Anthropic's brand colors and typography to artifacts |
| [**internal-comms**](https://github.com/anthropics/skills/tree/main/internal-comms)     | Write status reports, newsletters, and FAQs                |

### Meta

| Skill                                                                               | Description                                                 |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [**skill-creator**](https://github.com/anthropics/skills/tree/main/skill-creator)   | Guide for creating skills that extend Claude's capabilities |
| [**template-skill**](https://github.com/anthropics/skills/tree/main/template-skill) | Basic template for creating new skills                      |

## Community Skills

### Skill Collections

| Skill                                                                                     | Stars                                                                                              | Description                                       |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [**Composio Awesome Claude Skills**](https://github.com/ComposioHQ/awesome-claude-skills) | ![GitHub stars](https://img.shields.io/github/stars/ComposioHQ/awesome-claude-skills?style=social) | Collection of Claude skill examples from Composio |

### Productivity and Collaboration

| Skill                                                                                                                      | Stars                                                                                  | Description                            |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------- |
| [**Notion Skills for Claude**](https://www.notion.so/notiondevs/Notion-Skills-for-Claude-28da4445d27180c7af1df7d8615723d0) | -                                                                                      | Skills for working with Notion         |
| [**superpowers-lab**](https://github.com/obra/superpowers-lab)                                                             | ![GitHub stars](https://img.shields.io/github/stars/obra/superpowers-lab?style=social) | Lab environment for Claude superpowers |
| [**superpowers**](https://github.com/obra/superpowers)                                                                     | ![GitHub stars](https://img.shields.io/github/stars/obra/superpowers?style=social)     | Claude superpowers collection          |

### Development and Testing

| Skill                                                                        | Stars                                                                                            | Description                        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| [**ios-simulator-skill**](https://github.com/conorluddy/ios-simulator-skill) | ![GitHub stars](https://img.shields.io/github/stars/conorluddy/ios-simulator-skill?style=social) | Control iOS Simulator              |
| [**ffuf-claude-skill**](https://github.com/jthack/ffuf_claude_skill)         | ![GitHub stars](https://img.shields.io/github/stars/jthack/ffuf_claude_skill?style=social)       | Web fuzzing with ffuf              |
| [**playwright-skill**](https://github.com/lackeyjb/playwright-skill)         | ![GitHub stars](https://img.shields.io/github/stars/lackeyjb/playwright-skill?style=social)      | Browser automation with Playwright |

### Specialized Domains

| Skill                                                                                                   | Stars                                                                                                         | Description                             |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| [**claude-scientific-skills**](https://github.com/K-Dense-AI/claude-scientific-skills)                  | ![GitHub stars](https://img.shields.io/github/stars/K-Dense-AI/claude-scientific-skills?style=social)         | Scientific research and analysis skills |
| [**claude-win11-speckit-update-skill**](https://github.com/NotMyself/claude-win11-speckit-update-skill) | ![GitHub stars](https://img.shields.io/github/stars/NotMyself/claude-win11-speckit-update-skill?style=social) | Windows 11 system management            |
| [**claudisms**](https://github.com/jeffersonwarrior/claudisms)                                          | ![GitHub stars](https://img.shields.io/github/stars/jeffersonwarrior/claudisms?style=social)                  | SMS messaging integration               |

## Articles and Tutorials

### Official Documentation

- [Claude Skills Quickstart](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/quickstart) - Get started with Claude Skills
- [Claude Skills Best Practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices) - Best practices for creating skills
- [Skills Cookbook](https://github.com/anthropics/claude-cookbooks/blob/main/skills/README.md) - Skills examples and guides
- [Using Skills in Claude](https://support.claude.com/en/articles/12512180-using-skills-in-claude) - How to use skills in Claude
- [How to Create Custom Skills](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills) - Step-by-step guide to creating skills
- [Create a Skill Through Conversation](https://support.claude.com/en/articles/12599426-how-to-create-a-skill-with-claude-through-conversation) - Create skills by talking to Claude

### Official Articles

- [Equipping Agents for the Real World with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) - Technical deep dive into agent skills
- [Teach Claude Your Way of Working](https://support.claude.com/en/articles/12580051-teach-claude-your-way-of-working-using-skills) - Customize Claude with your workflow

### Community Articles

- [Simon Willison: Claude Skills](https://simonwillison.net/2025/Oct/16/claude-skills/) - Introduction to Claude Skills
- [Nick Nisi: Claude Skills](https://nicknisi.com/posts/claude-skills/) - Getting started with Claude Skills
- [Young Leaders: Claude Skills, Commands, Subagents, Plugins](https://www.youngleaders.tech/p/claude-skills-commands-subagents-plugins) - Comparison of Claude features

### Official Videos

- [Video Tutorial 1](https://www.youtube.com/watch?v=421T2iWTQio)
- [Video Tutorial 2](https://www.youtube.com/watch?v=G-5bInklwRQ)
- [Video Tutorial 3](https://www.youtube.com/watch?v=46zQX7PSHfU)
- [Video Tutorial 4](https://www.youtube.com/watch?v=IoqpBKrNaZI)

### Community Videos

- [Community Tutorial 1](https://www.youtube.com/watch?v=QpGWaWH1DxY)
- [Community Tutorial 2](https://www.youtube.com/watch?v=WKFFFumnzYI)
- [Community Tutorial 3](https://www.youtube.com/watch?v=FOqbS_llAms)
- [Community Tutorial 4](https://www.youtube.com/watch?v=v1y5EUSQ8WA)
- [Community Tutorial 5](https://www.youtube.com/watch?v=M8yaR-wNGj0)
- [Community Tutorial 6](https://www.youtube.com/watch?v=MZZCW179nKM)

## Contributing

To add a skill, submit a pull request with:

- Skill name and description
- Repository or download link
- Usage examples
- Setup requirements (if any)

---

## Resources

- [Official Claude Skills Announcement](https://www.anthropic.com/news/skills)
- [Claude Skills Documentation](https://docs.anthropic.com/)
- [Official Skills Examples (GitHub)](https://github.com/anthropics/claude-skills)

## License

This collection is [CC0](https://creativecommons.org/publicdomain/zero/1.0/) - free to use however you want.
