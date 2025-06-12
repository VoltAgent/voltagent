# with-anthropic

An [VoltAgent](https://github.com/vercel/voltagent) application.

## Getting Started

### Prerequisites

- Node.js (v20 or newer)
- npm, yarn, or pnpm

### Installation

1. Clone this repository
2. Install dependencies

```bash
npm install
# or
yarn
# or
pnpm install
```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

## Features

This project uses VoltAgent, a framework for building AI agents with the following capabilities:

- **Core** - The foundation for building and running AI agents
- **Vercel AI Provider** - Integration with Vercel AI SDK for LLM access
- **Custom Tools** - Add your own capabilities for your agents

## Project Structure

```
.
├── src/
│   └── index.ts       # Main application entry point with agent definition
├── .voltagent/        # Auto-generated folder for agent memory
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT
