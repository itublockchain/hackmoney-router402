# Frontend Testing Guide

## Overview

This project uses Vitest for unit and component testing, along with React Testing Library for testing React components.

## Stack

- **Vitest** - Fast unit test framework powered by Vite
- **@testing-library/react** - Testing utilities for React components
- **@testing-library/jest-dom** - Custom DOM matchers
- **@testing-library/user-event** - User interaction simulation
- **jsdom** - DOM implementation for Node.js

## Running Tests

```bash
# Run all tests once
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage report
bun run test:coverage

# Run tests with UI
bun run test:ui
```

## Project Structure

```
apps/web/
├── src/
│   ├── __tests__/
│   │   └── utils/
│   │       └── test-utils.tsx       # Custom render utilities
│   └── components/
│       └── ui/
│           ├── button.tsx
│           └── button.test.tsx      # Component tests
├── vitest.config.ts                 # Vitest configuration
├── vitest.setup.ts                  # Test setup file
└── TESTING.md                       # This file
```

## Configuration Files

### vitest.config.ts

Main configuration for Vitest:
- **Environment**: jsdom (simulates browser DOM)
- **Globals**: Enabled for describe, it, expect
- **Setup Files**: Runs vitest.setup.ts before tests
- **Coverage**: Configured with v8 provider
- **Path Aliases**: Resolves `@/*` imports

### vitest.setup.ts

Global test setup:
- Imports @testing-library/jest-dom matchers
- Configures automatic cleanup after each test

### tsconfig.json

Updated to include:
- Vitest type definitions
- Test files in compilation

## Writing Tests

### Basic Component Test

```typescript
import { render, screen } from "@/__tests__/utils/test-utils";
import { describe, expect, it } from "vitest";
import { MyComponent } from "./my-component";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```typescript
import userEvent from "@testing-library/user-event";

it("handles click events", async () => {
  const handleClick = vi.fn();
  const user = userEvent.setup();

  render(<Button onClick={handleClick}>Click me</Button>);

  await user.click(screen.getByRole("button"));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Testing with Props

```typescript
it("renders with different variants", () => {
  const { rerender } = render(<Button variant="default">Default</Button>);
  expect(screen.getByRole("button")).toHaveClass("bg-primary");

  rerender(<Button variant="destructive">Destructive</Button>);
  expect(screen.getByRole("button")).toHaveClass("bg-destructive");
});
```

## Custom Test Utilities

### test-utils.tsx

Located at `src/__tests__/utils/test-utils.tsx`, this file provides a custom render function that can be extended to wrap components with providers:

```typescript
import { render } from "@/__tests__/utils/test-utils";
```

To add providers (ThemeProvider, QueryClientProvider, etc.):

```typescript
function customRender(ui: ReactElement, options?: RenderOptions) {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={testQueryClient}>
        {ui}
      </QueryClientProvider>
    </ThemeProvider>,
    { ...options }
  );
}
```

## Common Matchers

From @testing-library/jest-dom:

```typescript
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toBeDisabled()
expect(element).toHaveClass("className")
expect(element).toHaveAttribute("attr", "value")
expect(element).toHaveTextContent("text")
```

## Best Practices

1. **Test user behavior, not implementation**
   - Focus on what users see and do
   - Avoid testing internal state or implementation details

2. **Use semantic queries**
   - Prefer `getByRole`, `getByLabelText`, `getByText`
   - Avoid `getByTestId` unless necessary

3. **Async operations**
   - Always use `await` with user-event
   - Use `findBy*` for elements that appear asynchronously

4. **Cleanup**
   - Automatic cleanup is configured in vitest.setup.ts
   - No need to manually cleanup after tests

5. **Mocking**
   - Use `vi.fn()` for function mocks
   - Use `vi.mock()` for module mocks

## Coverage

Coverage reports are generated in the `coverage/` directory with:
- HTML report (coverage/index.html)
- JSON report
- Text summary in terminal

Exclusions configured:
- node_modules/
- Configuration files
- Type definition files
- .next/ directory

## Troubleshooting

### Import Errors

If you see import errors with `@/*` paths:
- Ensure vitest.config.ts has correct path alias resolution
- Check tsconfig.json includes test files

### DOM Matchers Not Working

If matchers like `toBeInTheDocument()` are not recognized:
- Ensure vitest.setup.ts imports @testing-library/jest-dom
- Check tsconfig.json includes "vitest/globals" in types

### Tests Timing Out

- Increase timeout in vitest.config.ts
- Ensure async operations are properly awaited

## Example Test File

See `src/components/ui/button.test.tsx` for a comprehensive example covering:
- Basic rendering
- Props and variants
- User interactions
- Disabled states
- Custom classes
- Ref forwarding
- Children rendering

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [jest-dom Matchers](https://github.com/testing-library/jest-dom)
- [User Event API](https://testing-library.com/docs/user-event/intro)
