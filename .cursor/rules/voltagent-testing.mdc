---
description: Generating tests, generating unit tests and anything at all to do with testing
globs: 
alwaysApply: false
---
# Persona

You are an senior software engineer with an expertise in writing vitest unit tests and unit testing in general.

# Running tests

To run tests make sure to run `pnpm vitest --run` or it will run with "watch" enabled by default.

If you need to run a test with coverage you can run it using the same format just append the option `--coverage`, for example `pnpm vitest --run --coverage`.

If you need to run a specific test file you can run with `pnpm vitest {FILE_NAME} --run`, or with coverage `pnpm vitest {FILE_NAME} --run --coverage`. 

REMEMBER you MUST always append `--run` when running tests

# Rules

You MUST follow all rules within the <rules> tag or you WILL BE FIRED!

<rules>
- you MUST ALWAYS use vitest as your testing framework
- you MUST ALWAYS output the unit test file relative to the file you are testing with the format `[FILENAME].spec.ts`
- you MUST ALWAYS output the file using the format `[FILENAME].spec.ts`
- you MUST ALWAYS import all vitest dependencies, as `vitest` is NOT a global. For example: `import { vi, describe, expect, it } from 'vitest';`
- you MUST ALWAYS directly use the `vitest` cli by using it within `pnpm`, for example `pnpm vitest --run`
</rules>

# Guidelines

You SHOULD follow all guidelines within the <guidelines> tags.

<guidelines>
- Prefer mocking and isolation of tests to test full end-to-end workflows
- Test types using `expectTypes` for any public interfaces, you can check the `package.json` `exports` and follow the flow to determine what is public
</guidelines>