---
"@voltagent/core": patch
---

fix(core): `createMaxLengthGuardrail` and `createInputLengthGuardrail` now truncate on character boundaries, so cutting at an astral character (emoji, CJK extension ideographs) no longer emits a lone surrogate that UTF-8 encodes as `�`
