---
title: Evaluation Datasets
sidebar_position: 2
---

# Evaluation Datasets

Datasets are collections of test cases used to evaluate agent performance. Each dataset item contains an input prompt, an optional expected output, and metadata to help organize and analyze results.

## Dataset Structure

Datasets follow a consistent JSON structure whether stored locally or in VoltOps:

```js
{
  "name": "customer-support-qa",
  "description": "Customer support question-answer pairs",
  "tags": ["support", "qa", "production"],
  "metadata": {
    "version": "1.0.0",
    "created": "2025-01-10"
  },
  "data": [
    {
      "name": "refund-policy",
      "input": "What is your refund policy?",
      "expected": "We offer a 30-day money-back guarantee...",
      "extra": {
        "category": "policies",
        "difficulty": "easy"
      }
    }
  ]
}
```

### Field Descriptions

| Field         | Type     | Required | Description                           |
| ------------- | -------- | -------- | ------------------------------------- |
| `name`        | string   | Yes      | Unique identifier for the dataset     |
| `description` | string   | No       | Human-readable description            |
| `tags`        | string[] | No       | Labels for filtering and organization |
| `metadata`    | object   | No       | Additional structured data            |
| `data`        | array    | Yes      | Collection of dataset items           |

### Dataset Item Structure

Each item in the `data` array contains:

| Field      | Type   | Required | Description                                   |
| ---------- | ------ | -------- | --------------------------------------------- |
| `name`     | string | No       | Item identifier for tracking                  |
| `input`    | any    | Yes      | Input to the agent (string, object, or array) |
| `expected` | any    | No       | Expected output for comparison                |
| `extra`    | object | No       | Additional context or metadata                |

## Creating Datasets

### JSON Files

Store datasets as JSON files in `.voltagent/datasets/`:

```js
{
  "name": "math-problems",
  "description": "Basic arithmetic problems",
  "data": [
    {
      "input": "What is 15 + 27?",
      "expected": "42"
    },
    {
      "input": {
        "operation": "multiply",
        "a": 7,
        "b": 8
      },
      "expected": 56
    }
  ]
}
```

### Inline Datasets

Datasets can also be defined inline within experiment files:

```typescript
const inlineDataset = {
  items: [
    { input: "Hello", expected: "Hi there" },
    { input: "Goodbye", expected: "See you later" },
    { input: "How are you?", expected: "I'm doing well, thanks!" },
  ],
};
```

## CLI Commands

### Push Dataset to VoltOps

Upload a local dataset file to VoltOps:

```bash
voltagent eval dataset push --name math-problems
```

**Options:**

| Flag            | Description             | Default                           |
| --------------- | ----------------------- | --------------------------------- |
| `--name <name>` | Dataset name (required) | -                                 |
| `--file <path>` | Path to JSON file       | `.voltagent/datasets/<name>.json` |

**Environment Variables:**

- `VOLTAGENT_DATASET_NAME` - Default dataset name
- `VOLTAGENT_API_URL` - VoltOps API endpoint
- `VOLTAGENT_PUBLIC_KEY` - Authentication key
- `VOLTAGENT_SECRET_KEY` - Authentication secret

**Example:**

```bash
# Push custom file path
voltagent eval dataset push --name production-qa --file ./data/qa-pairs.json

# Use environment variable for name
export VOLTAGENT_DATASET_NAME=production-qa
voltagent eval dataset push
```

### Pull Dataset from VoltOps

Download a dataset version from VoltOps:

```bash
voltagent eval dataset pull --name math-problems
```

**Options:**

| Flag              | Description                 | Default                           |
| ----------------- | --------------------------- | --------------------------------- |
| `--name <name>`   | Dataset name                | Interactive prompt                |
| `--id <id>`       | Dataset ID (overrides name) | -                                 |
| `--version <id>`  | Version ID                  | Latest version                    |
| `--output <path>` | Output file path            | `.voltagent/datasets/<name>.json` |
| `--overwrite`     | Replace existing file       | false                             |
| `--page-size <n>` | Items per API request       | 200                               |

**Interactive Mode:**

When no dataset is specified, the CLI presents an interactive menu:

```bash
voltagent eval dataset pull

? Select a dataset to pull
❯ customer-support (5 versions)
  math-problems (3 versions)
  product-catalog (1 version)

? Select a version to pull for customer-support
❯ v3 • 150 items — Production dataset
  v2 • 100 items
  v1 • 50 items — Initial version
```

**File Conflict Resolution:**

When the target file exists:

```bash
? Local file already exists. Choose how to proceed:
❯ Overwrite existing file
  Save as new file (math-problems-remote.json)
  Cancel
```

## VoltOps Console

The VoltOps Console provides a web interface for dataset management at `https://console.voltagent.dev/evals/datasets`.

### Creating Datasets

1. Click **Create Dataset**
2. Enter dataset name and description
3. Add tags for organization
4. Submit to create an empty dataset

### Adding Items

**Single Item:**

1. Open a dataset
2. Click **Add Item**
3. Enter JSON for input and expected fields
4. Optionally add labels and metadata
5. Save the item

**Bulk Import:**

1. Click **Import Items**
2. Paste JSON array of items:

```js
[
  {
    label: "test-1",
    input: "What is 2+2?",
    expected: "4",
    extra: { category: "math" },
  },
  {
    label: "test-2",
    input: "What is the capital of France?",
    expected: "Paris",
    extra: { category: "geography" },
  },
];
```

### Version Management

Datasets automatically version when items change:

1. Each modification creates a new version
2. Versions are numbered sequentially (v1, v2, v3)
3. Previous versions remain immutable
4. Experiments reference specific versions

## Working with Dataset Items

### Input Formats

Input fields accept any JSON-serializable value:

```typescript
// String input
{ input: "Translate 'hello' to Spanish" }

// Object input
{ input: { text: "Hello", targetLang: "es" } }

// Array input
{ input: ["item1", "item2", "item3"] }

// Complex nested structure
{
  input: {
    messages: [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" }
    ],
    context: { userId: "123", sessionId: "abc" }
  }
}
```

### Expected Output Patterns

Expected values are compared by scorers:

```typescript
// Exact string match
{ expected: "The answer is 42" }

// Numeric comparison
{ expected: 3.14159 }

// Structured data
{ expected: { status: "success", result: 100 } }

// Partial matching with extra metadata
{
  expected: "Paris",
  extra: {
    acceptableAnswers: ["Paris", "Paris, France"],
    scoreThreshold: 0.8
  }
}
```

### Using Extra Metadata

The `extra` field provides context without affecting scoring:

```typescript
{
  input: "Summarize this article",
  expected: "Key points of the article...",
  extra: {
    articleLength: 500,
    domain: "technology",
    tags: ["ai", "machine-learning"],
    sourceUrl: "https://example.com/article",
    testPriority: "high"
  }
}
```

## Dataset Registration

Register datasets for reuse across experiments:

```typescript
// register-datasets.ts
import { registerExperimentDataset } from "@voltagent/evals";
import mathDatasetJson from "./.voltagent/datasets/math-problems.json";
import qaDatasetJson from "./data/qa-pairs.json";

// Register a JSON dataset
registerExperimentDataset({
  name: "math-problems",
  items: mathDatasetJson.data,
});

// Register another JSON dataset
registerExperimentDataset({
  name: "qa-pairs",
  items: qaDatasetJson.data,
});

// Register with VoltOps integration
registerExperimentDataset({
  name: "production-qa",
  descriptor: {
    id: "dataset_abc123",
    versionId: "version_xyz789",
  },
});

// Register with async data loader
registerExperimentDataset({
  name: "dynamic-dataset",
  resolver: async ({ limit, signal }) => {
    // Load data from API, database, etc.
    const response = await fetch("https://api.example.com/test-data", { signal });
    const data = await response.json();
    return {
      items: limit ? data.items.slice(0, limit) : data.items,
      total: data.total,
    };
  },
});
```

## Advanced Dataset Features

### Async Dataset Resolvers

Load datasets dynamically with resolver functions:

```typescript
registerExperimentDataset({
  name: "api-dataset",
  resolver: async ({ limit, signal }) => {
    // Parameters:
    // - limit: Maximum items requested
    // - signal: AbortSignal for cancellation

    const items = await loadFromDatabase(limit);

    return {
      items, // Array or AsyncIterable of items
      total: await getTotalCount(), // Optional total hint
      dataset: {
        // Optional metadata
        id: "db-dataset-1",
        name: "Database Dataset",
        metadata: { source: "postgres" },
      },
    };
  },
});
```
