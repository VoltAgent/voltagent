# andWhen - Conditional Logic

> **Add conditional logic to your workflow.** Execute steps only when conditions are met.

## What is andWhen?

`andWhen` executes a step only if a condition is true. If false, the original data passes through unchanged.

```typescript
const workflow = createWorkflowChain({
  id: "user-processor",
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
  condition: (data) => data.isVip,
  step: andThen({
    execute: async (data) => ({
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
  condition: (data, state) => boolean,  // condition function
  step: workflowStep                    // step to execute if true
})
```

### How It Works

1. **Condition is checked** with current data and state
2. **If true:** executes the step, returns step result
3. **If false:** skips the step, returns original data unchanged

```typescript
const conditionalWorkflow = createWorkflowChain({
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
  condition: (data) => data.userType === 'admin',
  step: andThen({
    execute: async (data) => ({
      ...data,
      adminPrefix: '[ADMIN]'
    })
  })
})
.andThen({
  execute: async (data) => ({
    message: `${data.adminPrefix || ''}${data.message}`
  })
});

// Admin user: { message: "[ADMIN]Hello" }
// Regular user: { message: "Hello" }
```

## Using State in Conditions

```typescript
const roleBasedWorkflow = createWorkflowChain({
  input: z.object({ request: z.string() }),
  result: z.object({
    request: z.string(),
    priority?: z.string(),
    escalated?: z.boolean()
  })
})
.andWhen({
  // Check user role from state
  condition: (data, state) => {
    const userRole = state.userContext?.get('role');
    return userRole === 'premium' || userRole === 'enterprise';
  },
  step: andThen({
    execute: async (data) => ({
      ...data,
      priority: 'high'
    })
  })
})
.andWhen({
  // Chain conditions - escalate high priority requests
  condition: (data) => data.priority === 'high',
  step: andAgent(
    (data) => `Analyze if this request needs escalation: ${data.request}`,
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
.andWhen({
  condition: (data, state) => {
    const userRole = state.userContext?.get('role');
    return userRole === 'admin' || userRole === 'manager';
  },
  step: andThen({
    execute: async (data) => ({
      ...data,
      sensitiveData: await fetchSensitiveData(data.userId)
    })
  })
})
```

### Data Validation

```typescript
.andWhen({
  condition: (data) => data.email && data.email.includes('@'),
  step: andThen({
    execute: async (data) => ({
      ...data,
      emailValid: true,
      domain: data.email.split('@')[1]
    })
  })
})
```

### Business Logic Branching

```typescript
.andWhen({
  condition: (data) => data.orderTotal > 100,
  step: andThen({
    execute: async (data) => ({
      ...data,
      freeShipping: true,
      shippingCost: 0
    })
  })
})
.andWhen({
  condition: (data) => data.orderTotal <= 100,
  step: andThen({
    execute: async (data) => ({
      ...data,
      freeShipping: false,
      shippingCost: 15
    })
  })
})
```

### AI-Based Conditions

```typescript
.andAgent(
  (data) => `Analyze sentiment of: "${data.feedback}"`,
  agent,
  {
    schema: z.object({
      sentiment: z.enum(['positive', 'negative', 'neutral']),
      confidence: z.number()
    })
  }
)
.andWhen({
  // Only escalate negative feedback with high confidence
  condition: (data) => data.sentiment === 'negative' && data.confidence > 0.8,
  step: andThen({
    execute: async (data) => ({
      ...data,
      escalateToManager: true,
      urgency: 'high'
    })
  })
})
```

## Multiple Conditions

You can chain multiple `andWhen` steps for complex logic:

```typescript
const processingWorkflow = createWorkflowChain({
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
  condition: (data) => data.country !== 'US',
  step: andThen({
    execute: async (data) => ({
      ...data,
      fee: data.amount * 0.03 // 3% international fee
    })
  })
})
.andWhen({
  // Large transactions need approval
  condition: (data) => data.amount > 10000,
  step: andThen({
    execute: async (data) => ({
      ...data,
      requiresApproval: true
    })
  })
})
.andWhen({
  // Apply tax for certain countries
  condition: (data) => ['UK', 'DE', 'FR'].includes(data.country),
  step: andThen({
    execute: async (data) => ({
      ...data,
      taxRate: 0.20 // 20% VAT
    })
  })
});
```

## Error Handling

```typescript
.andWhen({
  condition: (data) => {
    try {
      return data.riskyField && validateRiskyField(data.riskyField);
    } catch (error) {
      console.warn('Condition check failed:', error);
      return false; // Safe default
    }
  },
  step: andThen({
    execute: async (data) => {
      // This only runs if condition succeeded
      return { ...data, processed: true };
    }
  })
})
```

## Best Practices

### Keep Conditions Simple

```typescript
// Good: Simple, clear condition
.andWhen({
  condition: (data) => data.userType === 'premium',
  step: // ...
})

// Avoid: Complex condition logic
.andWhen({
  condition: (data) => {
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
// Good: Use state for user-specific conditions
.andWhen({
  condition: (data, state) => {
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
