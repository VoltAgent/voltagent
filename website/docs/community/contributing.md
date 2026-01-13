---
title: Contributing
---

We appreciate your interest in contributing to VoltAgent! VoltAgent aims to be a powerful and flexible backend framework focused on [mention core goals, e.g., building AI-powered applications, simplifying backend development, providing robust voice integration]. We value community contributions that help us achieve this vision.

We follow a [code of conduct](https://github.com/voltagent/voltagent/blob/main/CODE_OF_CONDUCT.md) when participating in the community. Please read it before you make any contributions.

**Get in touch:**

- If you plan to work on an issue, please mention so in the issue page before you start working.
- If you plan to work on a new feature, consider creating an issue first to discuss it with other community members/maintainers.
- Ask for help if you get stuck! Join our community at [Discord](https://s.voltagent.dev/discord).

## Project Focus & Contribution Areas

As a backend framework, we particularly welcome contributions in areas such as:

- **Core Framework:** Improving the fundamental APIs, performance optimizations, middleware enhancements, and overall developer experience.
- **CLI Tooling:** Adding new commands, improving existing ones, and enhancing the scaffolding process.
- **AI/Voice Integration:** Contributing to the `@voltagent/voice` package and improving ai-sdk provider usage across examples and guides.
- **Integrations:** Developing adapters for databases, external services, or other tools.
- **Examples & Use Cases:** Creating realistic examples demonstrating VoltAgent's features.
- **Bug Fixes & Performance Improvements:** Addressing existing issues and optimizing code across all packages.
- **Documentation:** Enhancing clarity, adding guides, and improving API references.

## Our Packages

VoltAgent is a monorepo containing several key packages:

- `@voltagent/core`: The heart of the framework, containing the main APIs, request/response handling, middleware pipeline, etc. Contributions here often involve core feature development or architectural improvements.
- `@voltagent/voice`: Handles voice input/output capabilities. Contributions could involve new STT/TTS integrations or improving voice interaction logic.
- `@voltagent/server-hono`: Recommended HTTP server provider for VoltAgent (Hono-based).
- `@voltagent/libsql`: LibSQL/Turso/SQLite memory adapter for persistent memory.
- `@voltagent/cloudflare-d1`: Cloudflare D1 memory adapter for Workers.
- `@voltagent/postgres`: PostgreSQL memory adapter for persistent memory.
- `@voltagent/supabase`: Supabase memory adapter for persistent memory.
- `@voltagent/langfuse-exporter`: Langfuse OpenTelemetry exporter integration.
- `@voltagent/anthropic-ai`, `@voltagent/google-ai`, `@voltagent/groq-ai`: Legacy provider packages (deprecated in favor of ai-sdk providers).
- `@voltagent/cli`: The command-line interface for creating and managing VoltAgent projects. Contributions typically involve adding/improving commands or developer workflows.
- `@voltagent/create-voltagent-app`: The scaffolding tool used by `npm create voltagent-app@latest`.

Understanding the purpose of each package helps in directing your contributions effectively.

## Ways to contribute

- **Stars on GitHub**: If you use VoltAgent and find it helpful, please star it on [GitHub](https://github.com/voltagent/voltagent)! 🌟
- **Improve documentation**: Good documentation is vital, especially for a backend framework. Help us by improving existing docs or adding new guides/API references.
- **Give feedback**: Share your experiences, suggest features (especially backend-focused ones), or report issues via [GitHub Issues](https://github.com/voltagent/voltagent/issues) or our community channel [Discord](https://s.voltagent.dev/discord).
- **Share VoltAgent**: Help spread the word about VoltAgent in the backend development community.
- **Contribute to codebase**: Help us build the best backend framework! You can work on new features (see Focus Areas above) or fix [existing issues](https://github.com/voltagent/voltagent/issues).
- **Share integrations/examples**: Built a cool backend service or integration with VoltAgent? Let us know!

## Setting Up Your Environment for Development

### Requirements

- [Node.js](https://nodejs.org/en/) version 20 or higher
- [Git](https://git-scm.com/) and [GitHub](https://github.com) account
- [pnpm](https://pnpm.io/) version 8.10.5 or higher (as per `package.json`)

### Cloning the Repository

Fork the VoltAgent repository (link-to-your-repo/fork) and clone your fork:

```sh
git clone https://github.com/<your-github-username>/VoltAgent.git # Replace with your fork
cd voltagent
```

### Installing Dependencies

After cloning, install dependencies using pnpm. This command also links workspace packages.

```sh title="Terminal"
pnpm install
```

You can build all packages later with:

```sh title="Terminal"
pnpm build
```

Or build specific packages:

```sh title="Terminal"
# Example: Build the core package
pnpm build --scope @voltagent/core
```

### Developing Packages

Run the development server for specific backend packages you are working on:

```sh title="Terminal"
# Example: Develop core and cli packages
pnpm dev --scope @voltagent/core --scope @voltagent/cli
```

Changes in the specified packages will trigger recompilation.

<details>
<summary>How to add a dependency to a package?</summary>

Navigate to the package directory and use `pnpm add`:

```sh title="Terminal"
# Example: Add 'lodash' to the core package
cd packages/core
pnpm add lodash
```

</details>

### Running Tests

Use `lerna run test` with `--scope` to run tests for the specific backend package(s) you modified:

```sh title="Terminal"
# Example: Run tests for the core package
pnpm test --scope @voltagent/core
```

To run tests for all packages:

```sh title="Terminal"
pnpm test:all
```

To get coverage reports:

```sh title="Terminal"
# For a specific package
pnpm test --scope @voltagent/core -- --coverage

# For all packages
pnpm test:all:coverage
```

## Working on Documentation

Our documentation resides in the `website` directory and uses [Docusaurus](https://docusaurus.io/).

**Note:** The `/website/` directory uses **npm** (not pnpm). It is intentionally kept separate from the main pnpm monorepo.

Navigate to the documentation directory and follow its setup instructions:

```sh title="Terminal"
cd website
npm install
npm start
```

## Committing Your Work and Preparing a Pull Request

We use several tools to ensure code quality and a consistent contribution process.

### Linting & Formatting

We use [Biome](https://biomejs.dev) for linting and formatting TypeScript/JavaScript/JSON files and [Prettier](https://prettier.io/) for Markdown.

- **Check:** `pnpm lint` or `pnpm lint:ci`
- **Fix:** `pnpm lint:fix`
- **Format Markdown:** `pnpm format` (This also runs Prettier on Markdown)

We recommend installing the [Biome VSCode extension](https://biomejs.dev/reference/vscode/) and a Prettier extension for a smoother development experience.

### Commit Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. Commit messages should follow the format:

```
<type>(<scope>): <description>
```

Where `<scope>` is typically the package name (e.g., `core`, `cli`, `voice`, `docs`).

Example: `feat(core): add new middleware feature` or `fix(cli): correct argument parsing`

### Creating a Changeset

For managing versioning and changelogs across our monorepo packages, we use [Changesets](https://github.com/changesets/changesets). Before committing changes that affect any package, create a changeset:

```sh title="Terminal"
pnpm changeset
```

Follow the prompts:

1. Select the package(s) you modified.
2. Choose the appropriate semantic version bump (`major`, `minor`, `patch`).
3. Write a clear description of the change. Reference the relevant GitHub issue number (e.g., `Fixes #123`).

Commit the generated `.changeset/*.md` file along with your code changes.

Example changeset content:

```md title=".changeset/cool-feature.md"
---
"@voltagent/core": minor
"@voltagent/cli": patch
---

feat(core): Implement awesome feature X

This feature allows users to do Y.

fix(cli): Correct flag parsing issue

Resolves #456
Fixes #789
```

### Creating a Pull Request

1. Push your changes (including the changeset file) to your forked repository.
2. Create a Pull Request against the `main` branch of the main VoltAgent repository (link-to-your-repo).
3. Ensure your PR title and description are clear. Reference any related issues.
4. CI checks (linting, tests, commitlint, changeset validation) will run automatically. Please address any failures.
5. Maintainers will review your PR. Be responsive to feedback.

We look forward to your contributions! 🎉
