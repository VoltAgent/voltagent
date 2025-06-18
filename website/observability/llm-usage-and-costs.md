---
title: LLM Usage & Costs
---

# LLM Usage & Costs

VoltOps automatically tracks and displays LLM usage statistics including prompt tokens, completion tokens, and total costs across all your AI interactions. Monitor your spending, optimize token usage, and analyze cost patterns in real-time.

![llm-usage-1](https://cdn.voltagent.dev/docs/voltop-docs/llm-cost-1.png)

### Automatic Pricing Calculation

When you include the model name in your metadata under `modelParameters`, VoltOps automatically calculates pricing for all supported LLM providers. This gives you instant cost visibility without manual configuration.

### Automatic model detection

- **VoltAgent Framework**: Automatically captures model information and calculates costs
- **Vercel AI SDK**: Built-in integration provides seamless cost tracking

### Manual model specification

- **JavaScript/TypeScript SDK** Include model name with usage information

```javascript
const agent = await trace.addAgent({
  name: "Support Agent",
  metadata: {
    modelParameters: {
      model: "gpt-4",
    },
    role: "customer-support",
    department: "customer-success",
  },
});
```

- **Python SDK** Include model name with usage information

```python
agent = await trace.add_agent(
    name="Support Agent",
    metadata={
        "modelParameters": {
            "model": "gpt-4",
        },
        "role": "customer-support",
        "department": "customer-success"
    }
)
```

![llm-usage-2](https://cdn.voltagent.dev/docs/voltop-docs/llm-cost-2.png)

## Usage Statistics Display

VoltOps provides detailed token usage breakdowns in your dashboard:

<div align="center">
<img src="https://cdn.voltagent.dev/docs/voltop-docs/console-cost.png" alt="console cost" width="300" />
</div>

<br/>

This gives you instant visibility into:

- **Prompt tokens**: Input text sent to the LLM
- **Completion tokens**: Generated response from the LLM
- **Total tokens**: Combined usage for accurate cost calculation
- **Cost breakdown**: Real-time pricing based on your model usage
