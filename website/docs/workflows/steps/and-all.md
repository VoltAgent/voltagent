# andAll - Parallel Execution

> **Run multiple steps in parallel.** Execute several operations simultaneously and wait for all to complete.

## What is andAll?

`andAll` executes multiple steps simultaneously and returns an array of all results. Like `Promise.all()` but for workflow steps.

```typescript
const workflow = createWorkflowChain({
  id: "data-enricher",
  input: z.object({ userId: z.string() }),
  result: z.object({
    userProfile: any,
    userPosts: any[],
    userAnalytics: any
  })
})
.andAll({
  steps: [
    // All three run in parallel
    andThen({
      execute: async (data) => {
        const profile = await fetchUserProfile(data.userId);
        return { userProfile: profile };
      }
    }),
    andThen({
      execute: async (data) => {
        const posts = await fetchUserPosts(data.userId);
        return { userPosts: posts };
      }
    }),
    andAgent(
      (data) => `Generate analytics for user ${data.userId}`,
      agent,
      {
        schema: z.object({
          userAnalytics: z.object({
            activityLevel: z.string(),
            interests: z.array(z.string())
          })
        })
      }
    )
  ]
})
.andThen({
  execute: async (data) => {
    // data is array: [{ userProfile }, { userPosts }, { userAnalytics }]
    return {
      userProfile: data[0].userProfile,
      userPosts: data[1].userPosts,
      userAnalytics: data[2].userAnalytics
    };
  }
});

const result = await workflow.run({ userId: "123" });
```

## Function Signature

```typescript
.andAll({
  steps: [step1, step2, step3, ...]  // array of workflow steps
})
```

### How It Works

1. **All steps start simultaneously** with the same input data
2. **Waits for all steps to complete** (like Promise.all)
3. **Returns array of results** in the same order as steps
4. **If any step fails, entire andAll fails**

```typescript
const parallelProcessor = createWorkflowChain({
  input: z.object({ numbers: z.array(z.number()) }),
  result: z.object({
    sum: z.number(),
    max: z.number(),
    min: z.number(),
    average: z.number(),
  }),
})
  .andAll({
    steps: [
      andThen({
        execute: async (data) => {
          const sum = data.numbers.reduce((a, b) => a + b, 0);
          return { operation: "sum", value: sum };
        },
      }),
      andThen({
        execute: async (data) => {
          const max = Math.max(...data.numbers);
          return { operation: "max", value: max };
        },
      }),
      andThen({
        execute: async (data) => {
          const min = Math.min(...data.numbers);
          return { operation: "min", value: min };
        },
      }),
      andThen({
        execute: async (data) => {
          const avg = data.numbers.reduce((a, b) => a + b, 0) / data.numbers.length;
          return { operation: "average", value: avg };
        },
      }),
    ],
  })
  .andThen({
    execute: async (data) => {
      // Convert array to object
      return {
        sum: data[0].value,
        max: data[1].value,
        min: data[2].value,
        average: data[3].value,
      };
    },
  });
```

## Using State in Parallel Steps

Each parallel step receives the same input data and state:

```typescript
const multiChannelNotifier = createWorkflowChain({
  input: z.object({ message: z.string() }),
  result: z.object({
    emailSent: z.boolean(),
    smsSent: z.boolean(),
    pushSent: z.boolean(),
  }),
})
  .andAll({
    steps: [
      andThen({
        execute: async (data, state) => {
          // Send email notification
          const userEmail = state.userContext?.get("email");
          const sent = await sendEmail(userEmail, data.message);
          return { emailSent: sent };
        },
      }),
      andThen({
        execute: async (data, state) => {
          // Send SMS notification
          const userPhone = state.userContext?.get("phone");
          const sent = await sendSMS(userPhone, data.message);
          return { smsSent: sent };
        },
      }),
      andThen({
        execute: async (data, state) => {
          // Send push notification
          const deviceId = state.userContext?.get("deviceId");
          const sent = await sendPush(deviceId, data.message);
          return { pushSent: sent };
        },
      }),
    ],
  })
  .andThen({
    execute: async (data) => {
      return {
        emailSent: data[0].emailSent,
        smsSent: data[1].smsSent,
        pushSent: data[2].pushSent,
      };
    },
  });
```

## Common Patterns

### API Calls in Parallel

```typescript
.andAll({
  steps: [
    andThen({
      execute: async (data) => {
        const weather = await fetch(`/api/weather/${data.city}`);
        return { weather: await weather.json() };
      }
    }),
    andThen({
      execute: async (data) => {
        const news = await fetch(`/api/news/${data.city}`);
        return { news: await news.json() };
      }
    }),
    andThen({
      execute: async (data) => {
        const events = await fetch(`/api/events/${data.city}`);
        return { events: await events.json() };
      }
    })
  ]
})
```

### Mixed Step Types

```typescript
.andAll({
  steps: [
    // Function step
    andThen({
      execute: async (data) => ({ userCount: await countUsers() })
    }),
    // AI step
    andAgent(
      (data) => `Analyze user trends for ${data.period}`,
      agent,
      {
        schema: z.object({
          insights: z.array(z.string())
        })
      }
    ),
    // Conditional step
    andWhen({
      condition: (data) => data.includeMetrics,
      step: andThen({
        execute: async (data) => ({ metrics: await getMetrics() })
      })
    })
  ]
})
```

### Data Validation in Parallel

```typescript
.andAll({
  steps: [
    andThen({
      execute: async (data) => ({
        emailValid: validateEmail(data.email)
      })
    }),
    andThen({
      execute: async (data) => ({
        phoneValid: validatePhone(data.phone)
      })
    }),
    andThen({
      execute: async (data) => ({
        addressValid: await validateAddress(data.address)
      })
    })
  ]
})
.andThen({
  execute: async (data) => {
    const allValid = data.every(result => Object.values(result)[0]);
    return { validationPassed: allValid, validations: data };
  }
})
```

## Performance Benefits

`andAll` provides significant performance improvements for independent operations:

```typescript
// Sequential: ~3 seconds total
.andThen({ execute: async (data) => await apiCall1(data) }) // 1s
.andThen({ execute: async (data) => await apiCall2(data) }) // 1s
.andThen({ execute: async (data) => await apiCall3(data) }) // 1s

// Parallel: ~1 second total (slowest operation)
.andAll({
  steps: [
    andThen({ execute: async (data) => await apiCall1(data) }), // 1s
    andThen({ execute: async (data) => await apiCall2(data) }), // 1s
    andThen({ execute: async (data) => await apiCall3(data) })  // 1s
  ]
})
```

## Error Handling

If any step fails, the entire `andAll` fails:

```typescript
.andAll({
  steps: [
    andThen({
      execute: async (data) => {
        try {
          return { result1: await riskyOperation1(data) };
        } catch (error) {
          console.warn('Operation 1 failed:', error);
          return { result1: null, error1: error.message };
        }
      }
    }),
    andThen({
      execute: async (data) => {
        // This will still run even if operation 1 fails
        return { result2: await reliableOperation2(data) };
      }
    })
  ]
})
.andThen({
  execute: async (data) => {
    // Handle mixed success/failure results
    if (data[0].error1) {
      console.log('Using fallback for operation 1');
    }
    return {
      result1: data[0].result1 || 'fallback',
      result2: data[1].result2
    };
  }
})
```

## Best Practices

### Independent Operations Only

```typescript
// Good: Independent operations
.andAll({
  steps: [
    andThen({ execute: async (data) => await fetchUserProfile(data.userId) }),
    andThen({ execute: async (data) => await fetchUserSettings(data.userId) }),
    andThen({ execute: async (data) => await fetchUserStats(data.userId) })
  ]
})

// Bad: Dependent operations
.andAll({
  steps: [
    andThen({ execute: async (data) => await createUser(data) }),
    andThen({ execute: async (data) => await assignRole(data.userId) }) // Needs user to exist first!
  ]
})
```

### Reasonable Parallelism

```typescript
// Good: 3-5 parallel operations
.andAll({
  steps: [step1, step2, step3, step4]
})

// Avoid: Too many parallel operations
.andAll({
  steps: [step1, step2, ..., step20] // May overwhelm external APIs
})
```

## Next Steps

- **[andRace](./and-race.md)** - First completed step wins
- **[andThen](./and-then.md)** - Process parallel results sequentially
- **[andWhen](./and-when.md)** - Add conditions to parallel steps

---

> **Quick Summary**: `andAll` runs multiple steps simultaneously and waits for all to complete. Returns an array of results in the same order as steps. Perfect for independent operations that can run in parallel.
