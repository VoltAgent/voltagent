# .changeset/ollama-integration.md

---

"@voltagent/ollama": minor
"@voltagent/core": patch

---

feat(ollama): Implement Ollama provider integration

This feature allows users to use local Ollama instance as an LLM provider within VoltAgent applications.

- Adds OllamaProvider class implementing LLMProvider interface
- Implements core text generation functionalities
- Adds configuration for Ollama endpoint URL
- Includes example implementation
- Updates provider documentation

Fixes #15
