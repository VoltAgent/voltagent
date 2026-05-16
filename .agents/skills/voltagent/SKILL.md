```markdown
# voltagent Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the key development patterns and conventions used in the `voltagent` TypeScript codebase. It covers file naming, import/export styles, commit message conventions, and testing patterns. By following these guidelines, contributors can write consistent, maintainable code and collaborate effectively.

## Coding Conventions

### File Naming
- Use **PascalCase** for file names.
  - Example: `MyComponent.ts`, `UserService.ts`

### Import Style
- Use **relative imports** for modules within the project.
  - Example:
    ```typescript
    import { UserService } from './UserService';
    ```

### Export Style
- Use **named exports** rather than default exports.
  - Example:
    ```typescript
    // UserService.ts
    export function UserService() { ... }
    ```
    ```typescript
    import { UserService } from './UserService';
    ```

### Commit Messages
- Use **conventional commit** format.
- Prefix new features with `feat`.
  - Example:
    ```
    feat: add user authentication
    ```

## Workflows

_No explicit workflows detected in this repository._

## Testing Patterns

- Test files follow the `*.test.*` pattern.
  - Example: `UserService.test.ts`
- Testing framework is **unknown** (not detected).
- Place tests alongside the code or in a dedicated test directory.
- Example test file structure:
  ```typescript
  // UserService.test.ts
  import { UserService } from './UserService';

  describe('UserService', () => {
    it('should return user data', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command | Purpose |
|---------|---------|
| /conventions | Show coding conventions and examples |
| /test-patterns | Show how to write and name tests |
| /commit-guide | Show commit message guidelines |
```
