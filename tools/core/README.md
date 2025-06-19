# `tools/core`

A set of `nx` tools for working with the VoltAgent repository.

## Usage

List all the available plugins and tools:

```bash
pnpm nx list core
```

## Tools

### generate: package

You can generate a new package in the `packages` directory:

```bash
pnpm nx generate @voltagent/core:package <name>
```

This will generate a new package in the `packages` directory with the given name (you will be prompted for the description).

## Development

### Building

Run `nx build core` to build the library.

### Running unit tests

Run `nx test core` to execute the unit tests via [Vitest](https://vitest.dev/).
