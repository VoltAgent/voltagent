# Execute Function API

All workflow steps use a consistent context-based API for their execute functions. This document explains how to use the execute function API effectively.

## Basic Structure

Every execute function receives a single context object with three properties:

```typescript
execute: async ({ data, state, getStepData }) => {
  // Your step logic here
  return result;
};
```

## Context Properties

### `data`

The input data passed to this step. For the first step, this is the workflow input. For subsequent steps, this is the output from the previous step.

```typescript
.andThen({
  id: "process-user",
  execute: async ({ data }) => {
    // data contains the output from the previous step
    console.log(data.name); // Access properties
    return {
      ...data,
      processed: true
    };
  }
})
```

### `state`

The workflow state containing execution metadata and context.

Available properties:

- `executionId` - Unique ID for this workflow execution
- `conversationId` - Optional conversation ID
- `userId` - Optional user ID
- `userContext` - User-specific context
- `input` - The original input to the workflow
- `startAt` - When the workflow started
- `status` - Current workflow status

```typescript
.andThen({
  id: "log-execution",
  execute: async ({ data, state }) => {
    console.log(`Execution ID: ${state.executionId}`);
    console.log(`Original input:`, state.input);
    return data;
  }
})
```

### `getStepData`

A helper function to access data from any previously executed step.

```typescript
getStepData(stepId: string): { input: any; output: any } | undefined
```

Returns an object with:

- `input` - The data that was passed to that step
- `output` - The data that step returned
- Returns `undefined` if the step hasn't been executed yet

```typescript
.andThen({
  id: "combine-results",
  execute: async ({ data, getStepData }) => {
    // Access data from specific previous steps
    const analysisStep = getStepData("analyze-text");
    const validationStep = getStepData("validate-input");

    if (analysisStep && validationStep) {
      return {
        currentData: data,
        analysisResult: analysisStep.output,
        validationResult: validationStep.output,
        // Access what was passed to the analysis step
        originalAnalysisInput: analysisStep.input
      };
    }

    return data;
  }
})
```

## Step Types

### Function Steps (`andThen`)

Basic function steps for data transformation:

```typescript
.andThen({
  id: "transform-data",
  name: "Transform Data",
  execute: async ({ data }) => {
    return {
      ...data,
      transformed: true,
      timestamp: new Date().toISOString()
    };
  }
})
```

### Agent Steps (`andAgent`)

AI agent steps where the task function also receives the context:

```typescript
.andAgent(
  // Task function receives the same context
  async ({ data }) => `Analyze this text: ${data.content}`,
  myAgent,
  {
    schema: z.object({
      sentiment: z.string(),
      summary: z.string()
    })
  }
)
```

### Conditional Steps (`andWhen`)

Steps that only execute when a condition is met:

```typescript
.andWhen({
  id: "process-if-valid",
  // Condition function also receives the context
  condition: async ({ data, getStepData }) => {
    const validation = getStepData("validate");
    return validation?.output?.isValid === true;
  },
  step: andThen({
    id: "process-valid-data",
    execute: async ({ data }) => {
      return { ...data, processed: true };
    }
  })
})
```

### Tap Steps (`andTap`)

Side-effect steps that don't modify the data flow:

```typescript
.andTap({
  id: "log-progress",
  execute: async ({ data, state }) => {
    console.log(`Processing ${state.executionId}: ${data.status}`);
    // Return value is ignored - data passes through unchanged
  }
})
```

### Parallel Steps (`andAll`, `andRace`)

Execute multiple steps in parallel:

```typescript
.andAll({
  id: "parallel-processing",
  steps: [
    andThen({
      id: "process-a",
      execute: async ({ data }) => ({ ...data, a: true })
    }),
    andThen({
      id: "process-b",
      execute: async ({ data }) => ({ ...data, b: true })
    })
  ]
})
```

## Advanced Patterns

### Accessing Multiple Previous Steps

```typescript
.andThen({
  id: "final-summary",
  execute: async ({ data, getStepData }) => {
    // Collect results from multiple steps
    const steps = ['step1', 'step2', 'step3'];
    const results = steps
      .map(id => getStepData(id))
      .filter(Boolean)
      .map(step => step.output);

    return {
      finalData: data,
      allResults: results
    };
  }
})
```

### Conditional Processing Based on Previous Steps

```typescript
.andThen({
  id: "adaptive-processing",
  execute: async ({ data, getStepData }) => {
    const analysisStep = getStepData("analyze");

    if (analysisStep?.output?.complexity === 'high') {
      // Complex processing
      return await complexProcess(data);
    } else {
      // Simple processing
      return await simpleProcess(data);
    }
  }
})
```

### Error Handling with Step Data

```typescript
.andThen({
  id: "error-recovery",
  execute: async ({ data, getStepData }) => {
    const previousStep = getStepData("risky-operation");

    if (!previousStep || previousStep.output.error) {
      // Fallback logic
      return {
        ...data,
        fallbackUsed: true,
        result: await fallbackOperation(data)
      };
    }

    return previousStep.output;
  }
})
```

## Type Safety

The execute function is fully type-safe. TypeScript will infer the correct types based on your workflow definition:

```typescript
const workflow = createWorkflowChain({
  input: z.object({ name: z.string(), age: z.number() }),
  result: z.object({ message: z.string() }),
  // ...
})
  .andThen({
    id: "process",
    execute: async ({ data }) => {
      // TypeScript knows data has { name: string, age: number }
      if (data.age >= 18) {
        return {
          ...data,
          isAdult: true,
        };
      }
      return data;
    },
  })
  .andThen({
    id: "create-message",
    execute: async ({ data }) => {
      // TypeScript knows data might have isAdult property
      const status = "isAdult" in data ? "an adult" : "a minor";
      return {
        message: `${data.name} is ${status}`,
      };
    },
  });
```

## Best Practices

1. **Always destructure the context** for cleaner code:

   ```typescript
   execute: async ({ data, state, getStepData }) => { ... }
   ```

2. **Check if steps exist** before accessing their data:

   ```typescript
   const stepData = getStepData("step-id");
   if (stepData) {
     // Use stepData.input or stepData.output
   }
   ```

3. **Use meaningful step IDs** for easier debugging and data access:

   ```typescript
   id: "validate-user-input"; // Good
   id: "step1"; // Less descriptive
   ```

4. **Return new objects** instead of mutating:

   ```typescript
   // Good
   return { ...data, newField: value };

   // Avoid
   data.newField = value;
   return data;
   ```

5. **Handle optional step data** gracefully:
   ```typescript
   const validation = getStepData("validate");
   const isValid = validation?.output?.isValid ?? false;
   ```
