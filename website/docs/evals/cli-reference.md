---
title: CLI Commands Reference
sidebar_position: 8
---

# CLI Commands Reference

The VoltAgent CLI provides commands for managing datasets and running experiments. All eval commands are available under `voltagent eval` or `npx @voltagent/cli eval`.

## Installation

### Quick Setup

Initialize VoltAgent in your project (automatically adds scripts to package.json):

```bash
npx @voltagent/cli init
```

This command will:

- Install `@voltagent/cli` as a dev dependency
- Add `"volt": "volt"` script to your package.json
- Create initial configuration files

### Manual Setup

Install the CLI and add to package.json scripts:

```bash
# Install as dev dependency
npm install --save-dev @voltagent/cli

# Or globally
npm install -g @voltagent/cli
```

Add to your `package.json`:

```json
{
  "scripts": {
    "volt": "volt"
  }
}
```

Now you can use:

```bash
npm run volt eval dataset push --name my-dataset
# Instead of: npx @voltagent/cli eval dataset push --name my-dataset
```

## Dataset Commands

### `eval dataset push`

Upload a local dataset JSON file to VoltOps.

```bash
# Using npm script
npm run volt eval dataset push --name <dataset-name>

# Or directly
voltagent eval dataset push --name <dataset-name>
```

**Options:**

| Option          | Description               | Default                           |
| --------------- | ------------------------- | --------------------------------- |
| `--name <name>` | Dataset name (required)   | -                                 |
| `--file <path>` | Path to dataset JSON file | `.voltagent/datasets/<name>.json` |

**Environment Variables:**

- `VOLTAGENT_DATASET_NAME` - Default dataset name
- `VOLTAGENT_API_URL` - VoltOps API endpoint (default: `https://api.voltagent.dev`)
- `VOLTAGENT_PUBLIC_KEY` - Authentication public key
- `VOLTAGENT_SECRET_KEY` - Authentication secret key
- `VOLTAGENT_CONSOLE_URL` - Console URL for dataset links

**Examples:**

```bash
# Push with environment variable
export VOLTAGENT_DATASET_NAME=production-qa
npm run volt eval dataset push

# Push specific file
npm run volt eval dataset push --name qa-tests --file ./data/custom-qa.json

# Push to different environment
VOLTAGENT_API_URL=https://staging-api.voltagent.dev \
  npm run volt eval dataset push --name staging-data
```

### `eval dataset pull`

Download a dataset from VoltOps to local filesystem.

```bash
npm run volt eval dataset pull [options]
```

**Options:**

| Option            | Description                             | Default                           |
| ----------------- | --------------------------------------- | --------------------------------- |
| `--name <name>`   | Dataset name to pull                    | Interactive prompt                |
| `--id <id>`       | Dataset ID (overrides name)             | -                                 |
| `--version <id>`  | Specific version ID                     | Latest version                    |
| `--output <path>` | Output file path                        | `.voltagent/datasets/<name>.json` |
| `--overwrite`     | Replace existing file without prompting | `false`                           |
| `--page-size <n>` | Items per API request (1-1000)          | `200`                             |

**Interactive Mode:**

When no options provided, presents an interactive menu:

1. Select dataset from list
2. Choose version if multiple exist
3. Confirm file location

**Conflict Resolution:**

When target file exists:

- Prompts for action (overwrite/new file/cancel)
- `--overwrite` flag skips prompt
- Suggests alternative filename

**Examples:**

```bash
# Interactive mode
npm run volt eval dataset pull

# Pull specific dataset
npm run volt eval dataset pull --name production-qa

# Pull specific version
npm run volt eval dataset pull --name qa-tests --version v3

# Pull by ID with custom output
npm run volt eval dataset pull \
  --id dataset_abc123 \
  --version version_xyz789 \
  --output ./test-data/qa.json

# Force overwrite
npm run volt eval dataset pull --name staging-data --overwrite
```

## Experiment Commands

### `eval run`

Execute an experiment definition against a dataset.

```bash
npm run volt eval run --experiment <path> [options]
```

**Options:**

| Option                     | Description                               | Default          |
| -------------------------- | ----------------------------------------- | ---------------- |
| `--experiment <path>`      | Path to experiment module file (required) | -                |
| `--dataset <name>`         | Override dataset name at runtime          | -                |
| `--experiment-name <name>` | Override experiment name for VoltOps      | -                |
| `--tag <trigger>`          | VoltOps trigger source tag                | `cli-experiment` |
| `--concurrency <n>`        | Maximum concurrent items (1-100)          | `1`              |
| `--dry-run`                | Run locally without VoltOps submission    | `false`          |

**Environment Variables:**

- `VOLTAGENT_PUBLIC_KEY` - Required for VoltOps integration
- `VOLTAGENT_SECRET_KEY` - Required for VoltOps integration
- `VOLTAGENT_API_URL` - VoltOps API endpoint
- `VOLTAGENT_DATASET_NAME` - Default dataset name

**Experiment File Format:**

The experiment file must export a default `createExperiment` result:

```typescript
// experiments/my-test.experiment.ts
import { createExperiment } from "@voltagent/evals";

export default createExperiment({
  id: "my-test",
  dataset: { name: "test-data" },
  runner: async ({ item }) => ({
    output: await processItem(item.input),
  }),
  scorers: [
    /* ... */
  ],
  passCriteria: { type: "passRate", min: 0.95 },
});
```

**Runtime Behavior:**

1. Loads and validates experiment module
2. Resolves dataset (override or defined)
3. Creates VoltOps run (unless dry-run)
4. Processes items with concurrency limit
5. Applies scorers and aggregates results
6. Streams progress to stdout
7. Reports final summary and pass/fail

**Output Format:**

```
Running experiment: my-test
Dataset: test-data (100 items)
Concurrency: 4

Progress: [=====>    ] 50/100 (50%)
Item 42 ✓ (score: 0.95)
Item 43 ✗ (score: 0.45)

Summary:
- Success: 95/100 (95%)
- Mean Score: 0.92
- Pass Criteria: ✓ PASSED

VoltOps Run: https://console.voltagent.dev/evals/runs/run_abc123
```

**Examples:**

```bash
# Basic run
npm run volt eval run --experiment ./experiments/qa-test.ts

# Override dataset
npm run volt eval run \
  --experiment ./experiments/qa-test.ts \
  --dataset production-qa-v2

# High concurrency
npm run volt eval run \
  --experiment ./experiments/batch-test.ts \
  --concurrency 20

# Local testing
npm run volt eval run \
  --experiment ./experiments/dev-test.ts \
  --dry-run

# CI/CD usage
npm run volt eval run \
  --experiment ./experiments/regression.ts \
  --tag github-actions \
  --experiment-name "PR #123 Regression"

# Full options
npm run volt eval run \
  --experiment ./src/experiments/comprehensive.ts \
  --dataset large-dataset \
  --experiment-name "Nightly Regression" \
  --tag scheduled \
  --concurrency 10
```

**Error Handling:**

- Missing experiment file → Error with path
- Invalid experiment format → Shows validation errors
- Dataset not found → Lists available datasets
- VoltOps connection failed → Falls back to local mode (with warning)
- Scorer errors → Logged but doesn't stop run
- Ctrl+C → Graceful shutdown with partial results

**Exit Codes:**

| Code | Description                     |
| ---- | ------------------------------- |
| 0    | Success - all pass criteria met |
| 1    | Failure - pass criteria not met |
| 2    | Error - execution error         |
| 130  | Interrupted - user cancelled    |

## Global Options

All commands support these global options:

| Option       | Description              |
| ------------ | ------------------------ |
| `--help`     | Show help for command    |
| `--version`  | Show CLI version         |
| `--verbose`  | Enable debug logging     |
| `--quiet`    | Suppress progress output |
| `--no-color` | Disable colored output   |

## Configuration

### Authentication

VoltOps authentication via environment variables:

```bash
export VOLTAGENT_PUBLIC_KEY=pk_live_xxxxx
export VOLTAGENT_SECRET_KEY=sk_live_xxxxx
```

Or use `.env` file:

```env
VOLTAGENT_PUBLIC_KEY=pk_live_xxxxx
VOLTAGENT_SECRET_KEY=sk_live_xxxxx
VOLTAGENT_API_URL=https://api.voltagent.dev
VOLTAGENT_CONSOLE_URL=https://console.voltagent.dev
```

### Project Configuration

Create `.voltagent/config.json` for project defaults:

```json
{
  "defaultDataset": "production-qa",
  "defaultConcurrency": 4,
  "experimentsPath": "./src/experiments",
  "datasetsPath": "./.voltagent/datasets"
}
```

## Troubleshooting

### Common Issues

**Authentication Failed:**

```
Error: Authentication failed (401)
```

- Verify `VOLTAGENT_PUBLIC_KEY` and `VOLTAGENT_SECRET_KEY`
- Check key permissions in VoltOps Console
- Ensure keys match environment (production/staging)

**Dataset Not Found:**

```
Error: Dataset "test-data" not found
```

- List available datasets: `voltagent eval dataset pull` (interactive)
- Check dataset name spelling
- Verify dataset exists in current project

**Experiment Module Error:**

```
Error: Failed to load experiment module
```

- Check file path is correct
- Ensure default export is `createExperiment` result
- Verify TypeScript compilation if using `.ts` files
- Check for missing dependencies

**Connection Timeout:**

```
Error: Request timeout (ETIMEDOUT)
```

- Check network connectivity
- Verify `VOLTAGENT_API_URL` is accessible
- Try with `--dry-run` for local testing
- Check firewall/proxy settings

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Unix/Linux
DEBUG=voltagent:* voltagent eval run --experiment ./test.ts

# Windows
set DEBUG=voltagent:* && voltagent eval run --experiment ./test.ts

# Or use --verbose flag
voltagent eval run --experiment ./test.ts --verbose
```

## See Also

- [Offline Evaluations](./offline-evaluations.md) - Running experiments programmatically
- [Datasets](./datasets.md) - Dataset structure and management
- [Creating Experiments](./offline-evaluations.md#creating-an-experiment) - Experiment configuration
- [VoltOps Console](https://console.voltagent.dev) - Web interface for results
