# VoltAgent with Dynamic Prompts Example

This example demonstrates how to use dynamic prompt management with VoltAgent.

## 🎯 What's in This Example

- **VoltOpsClient** for unified telemetry and prompt management
- **Dynamic instructions** with context-aware prompt loading
- **Template variables** for personalized responses
- **Graceful fallback** - uses static instructions when VoltOps is not available

## 🚀 Setup

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables (optional):

```bash
cp .env.example .env
# Edit .env file with your OpenAI API key
```

3. Run the example:

```bash
npm run dev
```

## 🔧 How It Works

### 1. VoltOpsClient Setup

```typescript
const voltOpsClient = new VoltOpsClient({
  baseUrl: process.env.VOLTOPS_BASE_URL || "https://api.voltops.dev",
  publicKey: process.env.VOLTOPS_PUBLIC_KEY || "demo-public-key",
  secretKey: process.env.VOLTOPS_SECRET_KEY || "demo-secret-key",
  telemetry: true,
  prompts: true,
});
```

### 2. Dynamic Instructions

```typescript
instructions: async (context) => {
  try {
    // Get dynamic prompt from VoltOps
    return await context.prompts.getPrompt({
      promptName: "customer-support-agent",
      variables: {
        companyName: "VoltAgent Corp",
        supportLevel: context.userContext.get("tier") || "standard",
        language: context.userContext.get("language") || "en",
      },
    });
  } catch (error) {
    // Fallback to static instructions
    return "You are a helpful customer support agent...";
  }
};
```

### 3. Usage with Context

```typescript
const response = await agent.generateText("Hi, I need help with my account", {
  userContext: new Map([
    ["tier", "premium"],
    ["language", "en"],
  ]),
});
```

## 📊 Test Scenarios

The example runs 3 different test scenarios:

1. **Standard Customer** (tier: standard, language: en)
2. **Premium Customer** (tier: premium, language: en)
3. **Spanish Customer** (tier: standard, language: es)

Each test shows how the dynamic prompt adapts to different contexts.

## 🎨 VoltOps Console Integration

In the VoltOps console, you can create the `customer-support-agent` prompt with this template:

```liquid
You are a helpful customer support agent for {{companyName}}.

{% if supportLevel == 'premium' %}
🌟 You are providing PREMIUM support - offer detailed assistance and priority treatment.
{% elsif supportLevel == 'enterprise' %}
🏢 You are providing ENTERPRISE support - offer comprehensive solutions and dedicated assistance.
{% else %}
You are providing standard support - be helpful and professional.
{% endif %}

{% if language == 'es' %}
Responde en español. Sé amable y profesional.
{% elsif language == 'fr' %}
Répondez en français. Soyez aimable et professionnel.
{% else %}
Respond in English. Be friendly and professional.
{% endif %}

Support Guidelines:
- Always be polite and understanding
- Provide clear, actionable solutions
- Ask clarifying questions when needed
- Escalate complex issues when appropriate
```

## 🔄 Fallback Mechanism

If VoltOps is not available or the prompt is not found, the code automatically falls back to static instructions:

```typescript
catch (error) {
  console.log('📝 Using fallback instructions (VoltOps not configured)');
  return `You are a helpful customer support agent for VoltAgent Corp...`;
}
```

This ensures the example works seamlessly even during development!

## 📝 Notes

- Environment variables are optional - works with demo keys and fallback
- OpenAI API key is required
- Use your real VoltOps credentials in production
