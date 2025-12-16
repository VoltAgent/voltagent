---
title: LLM Usage & Costs
---

# LLM Usage & Costs

VoltOps automatically tracks and displays LLM usage statistics including prompt tokens, completion tokens, and total costs across all your AI interactions. Monitor your spending, optimize token usage, and analyze cost patterns in real-time.

![llm-usage-1](https://cdn.voltagent.dev/docs/voltop-docs/llm-cost-1.png)

### Automatic Pricing Calculation

When you include the model name in your metadata under `modelParameters`, VoltOps automatically calculates pricing for all supported LLM providers. This gives you instant cost visibility without manual configuration.

### Automatic Model Detection

VoltAgent automatically captures model information and calculates costs from your agent configuration. No manual specification required.

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
