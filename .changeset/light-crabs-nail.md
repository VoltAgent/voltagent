---
"@voltagent/core": minor
---

fix(core): improve graceful shutdown by checking sole SIGINT/SIGTERM handler

## What Changed

Fixed graceful shutdown calling `process.exit()` in a `SIGINT/SIGTERM` handler when other frameworks add their own `SIGINT/SIGTERM` handlers. The shutdown handler now detect if the signal is only from VoltAgent or not. Also, changes the listener as on-time listener to handle the duplicate logs when there are another `SIGINT/SIGTERM`.

## The Problem (Before)

Calling process.exit(0) directly in a `SIGINT/SIGTERM` handler, as is done in setupShutdownHandlers, can be problematic. It exits the process immediately and interrupts/short circuits any subsequent user-defined process handlers or async cleanup processes; not desirable in library code.

Other frameworks and dev servers add their own `SIGINT/SIGTERM` handlers that could get skipped or interrupted.

## The Solution (After)

- Setup graceful shutdown handlers now detect if the signal is only from VoltAgent or not
- It causes duplicates log since the library doesn't terminated now. The `SIGINT/SIGTERM` handlers listened the signal more than once. From this, we changes the listener as on-time listener to handle the duplicate logs when there are another `SIGINT/SIGTERM`
