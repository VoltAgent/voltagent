---
"@voltagent/rag": patch
---

fix(rag): keep tiktoken token offsets aligned with the text for multi-byte characters

`createTikTokenizer().tokenize` decoded each token on its own. A character that spans several tokens (most CJK text and emoji) decodes to U+FFFD per token, which is one unit long whatever the character really is, so the offsets drifted ahead of the text. `TokenChunker` and `SentenceChunker` use those offsets to cut the text, so chunks of Chinese, Japanese or emoji text could hold more tokens than `maxTokens` and could end between the two halves of a surrogate pair. The tokens of an unfinished character now sit at its start and the whole character goes to the token that completes it, so chunks end on whole characters and hold at most the tokens of one straddling character more than `maxTokens`.
