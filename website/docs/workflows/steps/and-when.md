# andWhen

> Add if/then logic to your workflow. Run steps only when conditions are met.

## Quick Start

```typescript
import { createWorkflowChain, andThen } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "process-order",
  input: z.object({ amount: z.number() }),
}).andWhen({
  id: "check-large-order",
  condition: ({ data }) => data.amount > 1000,
  step: andThen({
    id: "apply-discount",
    execute: async ({ data }) => ({
      ...data,
      discount: 0.1,
      total: data.amount * 0.9,
    }),
  }),
});

// Large order: { amount: 2000, discount: 0.1, total: 1800 }
// Small order: { amount: 500 } (unchanged)
```

## How It Works

```typescript
.andWhen({
  condition: ({ data }) => boolean,  // If this returns true...
  step: someStep                     // ...then run this step
})
```

- **If condition is true**: Run the step and use its output
- **If condition is false**: Skip the step, keep original data

## Function Signature

```typescript
.andWhen({
  id: "step-name",
  condition: ({ data }) => data.someField > 100,
  step: andThen({ execute: async () => {...} }),
  retries?: number
})
```

## Common Patterns

### Check User Permissions

```typescript
.andWhen({
  id: "check-admin",
  condition: ({ state }) => state.context?.get("role") === "admin",
  step: andThen({
    id: "admin-action",
    execute: async ({ data }) => ({
      ...data,
      adminData: await getAdminData()
    })
  })
})
```

### Validate Data

```typescript
.andWhen({
  id: "validate-email",
  condition: ({ data }) => data.email && data.email.includes("@"),
  step: andThen({
    id: "process-valid-email",
    execute: async ({ data }) => ({
      ...data,
      emailValid: true,
      domain: data.email.split("@")[1]
    })
  })
})
```

### Apply Business Rules

```typescript
.andWhen({
  id: "free-shipping",
  condition: ({ data }) => data.orderTotal > 100,
  step: andThen({
    id: "apply-free-shipping",
    execute: async ({ data }) => ({
      ...data,
      shipping: 0,
      message: "Free shipping applied!"
    })
  })
})
```

## Chain Multiple Conditions

```typescript
workflow
  .andWhen({
    id: "check-international",
    condition: ({ data }) => data.country !== "US",
    step: andThen({
      id: "apply-fee",
      execute: async ({ data }) => ({
        ...data,
        fee: data.amount * 0.03,
      }),
    }),
  })
  .andWhen({
    id: "check-large-amount",
    condition: ({ data }) => data.amount > 10000,
    step: andThen({
      id: "require-approval",
      execute: async ({ data }) => ({
        ...data,
        requiresApproval: true,
      }),
    }),
  });
```

## Schema Support

Define schemas for type-safe conditions:

```typescript
.andWhen({
  id: "check-approval",
  condition: ({ data }) => data.amount > 1000,
  step: andThen({
    id: "get-approval",
    suspendSchema: z.object({
      reason: z.string()
    }),
    resumeSchema: z.object({
      approved: z.boolean(),
      approver: z.string()
    }),
    execute: async ({ data, suspend, resumeData }) => {
      if (resumeData) {
        return { ...data, ...resumeData };
      }
      await suspend({ reason: "Amount exceeds limit" });
    }
  })
})
```

## Best Practices

1. **Keep conditions simple** - One check per condition
2. **Return false by default** - Safer than throwing errors
3. **Use state for context** - Store user info, permissions, etc.
4. **Chain for complex logic** - Multiple small conditions > one big condition

## Next Steps

- **[andAll](./and-all.md)** - Run multiple steps in parallel
- **[andRace](./and-race.md)** - First completed step wins
- **[andThen](./and-then.md)** - Chain conditional results with functions
- **[REST API](../../api/overview.md#workflow-endpoints)** - Execute workflows externally

---

> **Remember**: `andWhen` is if/then for workflows. True runs the step, false skips it.
