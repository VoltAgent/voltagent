# andWhen - Conditional Logic

> **Add conditional logic to your workflow.** Execute steps only when conditions are met.

## What is andWhen?

`andWhen` executes a step only if a condition is true. If false, the original data passes through unchanged.

```typescript
import { createWorkflowChain, andThen } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "user-processor",
  name: "User Processor",
  input: z.object({
    email: z.string(),
    isVip: z.boolean()
  }),
  result: z.object({
    email: z.string(),
    isVip: z.boolean(),
    vipDiscount?: z.number()
  })
})
.andWhen({
  id: "check-vip-status",
  condition: ({ data }) => data.isVip,
  step: andThen({
    id: "apply-vip-discount",
    execute: async ({ data }) => ({
      ...data,
      vipDiscount: 0.2 // 20% discount for VIP users
    })
  })
});

const result = await workflow.run({ email: "john@example.com", isVip: true });
// { email: "john@example.com", isVip: true, vipDiscount: 0.2 }
```

## Function Signature

```typescript
.andWhen({
  condition: ({ data, state }) => boolean,  // condition function
  step: workflowStep                        // step to execute if true
})
```

### How It Works

1. **Condition is checked** with current data and state
2. **If true:** executes the step, returns step result
3. **If false:** skips the step, returns original data unchanged

```typescript
import { createWorkflowChain, andThen } from "@voltagent/core";
import { z } from "zod";

const conditionalWorkflow = createWorkflowChain({
  id: "conditional-workflow",
  name: "Conditional Workflow",
  input: z.object({
    userType: z.string(),
    message: z.string()
  }),
  result: z.object({
    message: z.string(),
    adminPrefix?: z.string()
  })
})
.andWhen({
  // Only execute for admin users
  id: "check-admin-user",
  condition: ({ data }) => data.userType === 'admin',
  step: andThen({
    id: "add-admin-prefix",
    execute: async ({ data }) => ({
      ...data,
      adminPrefix: '[ADMIN]'
    })
  })
})
.andThen({
  id: "format-message",
  execute: async ({ data }) => ({
    message: `${data.adminPrefix || ''}${data.message}`
  })
});

// Admin user: { message: "[ADMIN]Hello" }
// Regular user: { message: "Hello" }
```

## Using State in Conditions

```typescript
import { createWorkflowChain, andThen, andAgent } from "@voltagent/core";
import { z } from "zod";

const roleBasedWorkflow = createWorkflowChain({
  id: "role-based-workflow",
  name: "Role Based Workflow",
  input: z.object({ request: z.string() }),
  result: z.object({
    request: z.string(),
    priority?: z.string(),
    escalated?: z.boolean()
  })
})
.andWhen({
  // Check user role from state
  id: "check-premium-role",
  condition: ({ data, state }) => {
    const userRole = state.userContext?.get('role');
    return userRole === 'premium' || userRole === 'enterprise';
  },
  step: andThen({
    id: "set-high-priority",
    execute: async ({ data }) => ({
      ...data,
      priority: 'high'
    })
  })
})
.andWhen({
  // Chain conditions - escalate high priority requests
  id: "check-high-priority",
  condition: ({ data }) => data.priority === 'high',
  step: andAgent(
    ({ data }) => `Analyze if this request needs escalation: ${data.request}`,
    agent,
    {
      schema: z.object({
        escalated: z.boolean(),
        reasoning: z.string()
      })
    }
  )
});
```

## Common Patterns

### User Permission Checks

```typescript
import { createWorkflowChain, andThen } from "@voltagent/core";
import { z } from "zod";

createWorkflowChain({
  id: "permission-check-workflow",
  name: "Permission Check Workflow",
  input: z.object({ userId: z.string() }),
  result: z.object({ sensitiveData: any }),
}).andWhen({
  id: "check-user-permissions",
  condition: ({ data, state }) => {
    const userRole = state.userContext?.get("role");
    return userRole === "admin" || userRole === "manager";
  },
  step: andThen({
    id: "fetch-sensitive-data",
    execute: async ({ data }) => ({
      ...data,
      sensitiveData: await fetchSensitiveData(data.userId),
    }),
  }),
});
```

### Data Validation

```typescript
import { createWorkflowChain, andThen } from "@voltagent/core";
import { z } from "zod";

createWorkflowChain({
  id: "validation-workflow",
  name: "Validation Workflow",
  input: z.object({ email: z.string() }),
  result: z.object({ emailValid: z.boolean(), domain: z.string() }),
}).andWhen({
  id: "validate-email-format",
  condition: ({ data }) => data.email && data.email.includes("@"),
  step: andThen({
    id: "set-email-valid",
    execute: async ({ data }) => ({
      ...data,
      emailValid: true,
      domain: data.email.split("@")[1],
    }),
  }),
});
```

### Business Logic Branching

```typescript
import { createWorkflowChain, andThen } from "@voltagent/core";
import { z } from "zod";

createWorkflowChain({
  id: "business-logic-workflow",
  name: "Business Logic Workflow",
  input: z.object({ orderTotal: z.number() }),
  result: z.object({ freeShipping: z.boolean(), shippingCost: z.number() }),
})
  .andWhen({
    id: "check-free-shipping",
    condition: ({ data }) => data.orderTotal > 100,
    step: andThen({
      id: "apply-free-shipping",
      execute: async ({ data }) => ({
        ...data,
        freeShipping: true,
        shippingCost: 0,
      }),
    }),
  })
  .andWhen({
    id: "check-standard-shipping",
    condition: ({ data }) => data.orderTotal <= 100,
    step: andThen({
      id: "apply-standard-shipping",
      execute: async ({ data }) => ({
        ...data,
        freeShipping: false,
        shippingCost: 15,
      }),
    }),
  });
```

### AI-Based Conditions

```typescript
import { createWorkflowChain, andAgent, andThen } from "@voltagent/core";
import { z } from "zod";

createWorkflowChain({
  id: "ai-condition-workflow",
  name: "AI Condition Workflow",
  input: z.object({ feedback: z.string() }),
  result: z.object({ escalateToManager: z.boolean(), urgency: z.string() }),
})
  .andAgent(({ data }) => `Analyze sentiment of: "${data.feedback}"`, agent, {
    schema: z.object({
      sentiment: z.enum(["positive", "negative", "neutral"]),
      confidence: z.number(),
    }),
  })
  .andWhen({
    // Only escalate negative feedback with high confidence
    id: "check-negative-feedback",
    condition: ({ data }) => data.sentiment === "negative" && data.confidence > 0.8,
    step: andThen({
      id: "escalate-feedback",
      execute: async ({ data }) => ({
        ...data,
        escalateToManager: true,
        urgency: "high",
      }),
    }),
  });
```

## Multiple Conditions

You can chain multiple `andWhen` steps for complex logic:

```typescript
import { createWorkflowChain, andThen } from "@voltagent/core";
import { z } from "zod";

const processingWorkflow = createWorkflowChain({
  id: "multi-condition-workflow",
  name: "Multi-Condition Workflow",
  input: z.object({
    amount: z.number(),
    currency: z.string(),
    country: z.string()
  }),
  result: z.object({
    amount: z.number(),
    currency: z.string(),
    country: z.string(),
    fee?: z.number(),
    taxRate?: z.number(),
    requiresApproval?: z.boolean()
  })
})
.andWhen({
  // International transactions have fees
  id: "check-international-transaction",
  condition: ({ data }) => data.country !== 'US',
  step: andThen({
    id: "apply-international-fee",
    execute: async ({ data }) => ({
      ...data,
      fee: data.amount * 0.03 // 3% international fee
    })
  })
})
.andWhen({
  // Large transactions need approval
  id: "check-large-transaction",
  condition: ({ data }) => data.amount > 10000,
  step: andThen({
    id: "require-approval",
    execute: async ({ data }) => ({
      ...data,
      requiresApproval: true
    })
  })
})
.andWhen({
  // Apply tax for certain countries
  id: "check-country-tax",
  condition: ({ data }) => ['UK', 'DE', 'FR'].includes(data.country),
  step: andThen({
    id: "apply-vat",
    execute: async ({ data }) => ({
      ...data,
      taxRate: 0.20 // 20% VAT
    })
  })
});
```

## Error Handling

```typescript
import { createWorkflowChain, andThen } from "@voltagent/core";
import { z } from "zod";

createWorkflowChain({
  id: "error-handling-workflow",
  name: "Error Handling Workflow",
  input: z.object({ riskyField: any }),
  result: z.object({ processed: z.boolean() }),
}).andWhen({
  id: "validate-risky-field",
  condition: ({ data }) => {
    try {
      return data.riskyField && validateRiskyField(data.riskyField);
    } catch (error) {
      console.warn("Condition check failed:", error);
      return false; // Safe default
    }
  },
  step: andThen({
    id: "process-risky-field",
    execute: async ({ data }) => {
      // This only runs if condition succeeded
      return { ...data, processed: true };
    },
  }),
});
```

## Best Practices

### Keep Conditions Simple

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

createWorkflowChain({
  id: "simple-condition-workflow",
  name: "Simple Condition Workflow",
  input: z.object({ userType: z.string() }),
  result: z.object({}),
}).andWhen({
  id: "check-premium-user",
  condition: ({ data }) => data.userType === 'premium',
  step: // ...
})

// Avoid: Complex condition logic
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

createWorkflowChain({
  id: "complex-condition-workflow",
  name: "Complex Condition Workflow",
  input: z.object({ userId: z.string(), permissions: z.array(z.string()) }),
  result: z.object({}),
}).andWhen({
  id: "check-complex-condition",
  condition: ({ data }) => {
    // Too much logic in condition
    const hasAccess = checkUserAccess(data.userId);
    const isValidTime = isBusinessHours();
    const hasPermission = data.permissions.includes('advanced');
    return hasAccess && isValidTime && hasPermission;
  },
  step: // ...
})
```

### Use State for User Context

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

createWorkflowChain({
  id: "state-condition-workflow",
  name: "State Condition Workflow",
  input: z.object({}),
  result: z.object({}),
}).andWhen({
  id: "check-enterprise-plan",
  condition: ({ data, state }) => {
    const userPlan = state.userContext?.get('plan');
    return userPlan === 'enterprise';
  },
  step: // ...
})
```

## Next Steps

- **[andAll](./and-all.md)** - Run multiple steps in parallel
- **[andRace](./and-race.md)** - First completed step wins
- **[andThen](./and-then.md)** - Chain conditional results with functions

---

> **Quick Summary**: `andWhen` executes steps conditionally. If condition is true, runs the step and returns its result. If false, skips the step and passes original data through unchanged.
