# Retrieval

Retrieval gives an agent relevant document context before it answers. Attach a retriever to an agent to search on every turn, or expose the retriever as a tool so the agent can decide when to search.

## Source references

The retriever can put source references in the operation context. This chatbot stores matched Markdown file paths and section headings under the `references` key and includes them in the text sent to the model.
