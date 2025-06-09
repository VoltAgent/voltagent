---
"@voltagent/core": patch
---

feat: add messages parameter to onEnd hook with full conversation flow

Added `messages` array to the `onEnd` hook arguments, containing the complete conversation turn including tool calls and results. On success, includes user input, tool interactions, and final assistant response. On error, includes user input and any tool interactions that occurred before the error.

```ts
const hooks = createHooks({
  onEnd: async ({ agent, output, error, messages, context }) => {
    // messages now contains full conversation flow:
    // [
    //   { role: "user", content: "Use weather tool for San Francisco" },
    //   {
    //     role: "assistant",
    //     content: "[{\"type\":\"tool-call\",\"toolCallId\":\"call_mmZhyZwnheCjZQCRxFPR14pF\",\"toolName\":\"getWeather\",\"args\":{\"location\":\"San Francisco\"}}]",
    //   },
    //   {
    //     role: "tool",
    //     content: "[{\"type\":\"tool-result\",\"toolCallId\":\"call_mmZhyZwnheCjZQCRxFPR14pF\",\"toolName\":\"getWeather\",\"result\":{\"weather\":{\"location\":\"San Francisco\",\"temperature\":8,\"condition\":\"Rainy\",\"humidity\":86,\"windSpeed\":14},\"message\":\"Current weather in San Francisco: 8°C and rainy with 86% humidity and wind speed of 14 km/h.\"}}]",
    //   },
    //   { role: "assistant", content: "The weather in San Francisco is sunny and 22°C." }
    // ]
  },
});
```
