---
title: Release Versioning
---

# Release Versioning

VoltOps lets you track different versions of agents, prompts, or models using the version and release fields in your trace metadata.

This allows you to:
• Compare behavior across deployments
• Monitor changes in performance after a new prompt or logic update
• Run experiments or A/B tests with confidence
• Track rollouts and rollbacks effectively

## Basic Release Tracking

Add a `release` field to your trace metadata to track different deployments:

```javascript
const trace = await sdk.trace({
  name: "Customer Support Query",
  agentId: "support-agent-v1",
  input: { query: "How to reset password?" },
  userId: "user-123",
  conversationId: "conv-456",
  tags: ["support", "password-reset"],
  metadata: {
    release: "v2.1.0", // Release identifier
    version: "2.1.0",
    environment: "production",
    deployment: "blue-green",
  },
});
```

## Multi-SDK Examples

### Python SDK

```python
async with sdk.trace(
    agentId="support-agent-v1",
    input={"query": "How to reset password?"},
    userId="user-123",
    tags=["support", "password-reset"],
    metadata={
        "release": "v2.1.0",
        "version": "2.1.0",
        "modelVersion": "gpt-4-turbo-preview",
        "promptVersion": "support-prompt-v3"
    }
) as trace:
    # Your agent logic here
    pass
```

### Vercel AI SDK

```javascript
const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "How to reset password?",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "support-agent-v1",
      userId: "user-123",
      release: "v2.1.0", // Release tracking
      version: "2.1.0",
      modelVersion: "gpt-4o-mini-2024",
      promptVersion: "support-v3",
    },
  },
});
```

## Release Comparison Scenarios

### A/B Testing

Track different versions running simultaneously:

```javascript
// Version A - Current production
const traceA = await sdk.trace({
  name: "Support Query A",
  agentId: "support-agent-v1",
  metadata: {
    release: "v2.0.0",
    experiment: "support-improvement",
    variant: "control",
    promptVersion: "support-prompt-v2",
  },
});

// Version B - New experimental version
const traceB = await sdk.trace({
  name: "Support Query B",
  agentId: "support-agent-v1",
  metadata: {
    release: "v2.1.0-beta",
    experiment: "support-improvement",
    variant: "treatment",
    promptVersion: "support-prompt-v3",
  },
});
```

### Model Upgrades

Track model version changes:

```javascript
const trace = await sdk.trace({
  name: "Content Generation",
  agentId: "content-writer",
  metadata: {
    release: "v3.0.0",
    modelVersion: "gpt-4-turbo",
    previousModel: "gpt-4",
    upgradeReason: "performance-improvement",
    rolloutPercentage: 25,
  },
});
```

### Prompt Engineering Iterations

Track prompt changes and performance:

```javascript
const trace = await sdk.trace({
  name: "Code Review",
  agentId: "code-reviewer",
  metadata: {
    release: "v1.5.0",
    promptVersion: "code-review-v4",
    promptChanges: ["added-security-focus", "improved-examples"],
    baselineVersion: "code-review-v3",
  },
});
```

## Release Analytics

### Performance Comparison

Use release data to compare metrics:

```javascript
// Dashboard queries
// Compare average response time by release
release:v2.0.0 → Avg: 2.1s
release:v2.1.0 → Avg: 1.8s (14% improvement)

// Compare success rates
release:v2.0.0 → Success: 94.2%
release:v2.1.0 → Success: 97.1% (2.9% improvement)

// Compare user satisfaction
release:v2.0.0 → Satisfaction: 4.2/5
release:v2.1.0 → Satisfaction: 4.6/5 (9.5% improvement)
```

### Rollout Monitoring

Track gradual rollouts:

```javascript
const trace = await sdk.trace({
  name: "Gradual Rollout",
  agentId: "production-agent",
  metadata: {
    release: "v2.2.0",
    rolloutStage: "canary", // canary, 25%, 50%, 100%
    rolloutPercentage: 5,
    canaryGroup: "internal-users",
    fallbackRelease: "v2.1.0",
  },
});
```

## Best Practices

### Semantic Versioning

Use consistent version naming:

```javascript
// ✅ Good: Semantic versioning
metadata: {
  release: "v2.1.0",          // Major.Minor.Patch
  version: "2.1.0",
  modelVersion: "gpt-4-1106"
}

// ❌ Avoid: Inconsistent naming
metadata: {
  release: "release_2",
  version: "new_version",
  modelVersion: "latest"
}
```

### Environment Separation

Track releases by environment:

```javascript
// Production
metadata: {
  release: "v2.1.0",
  environment: "production",
  deployment: "stable"
}

// Staging
metadata: {
  release: "v2.2.0-rc1",
  environment: "staging",
  deployment: "release-candidate"
}

// Development
metadata: {
  release: "v2.2.0-dev",
  environment: "development",
  deployment: "feature-branch"
}
```

### Change Tracking

Document what changed between releases:

```javascript
metadata: {
  release: "v2.1.0",
  changes: [
    "improved-error-handling",
    "updated-system-prompt",
    "added-context-awareness"
  ],
  changelog: "https://docs.company.com/releases/v2.1.0",
  previousRelease: "v2.0.0"
}
```

Release versioning transforms deployment chaos into organized, trackable progress, enabling data-driven decisions about your AI system improvements.
