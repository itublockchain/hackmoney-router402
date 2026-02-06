import { type RenderOptions, render } from "@testing-library/react";

import type { ReactElement } from "react";

/**
 * Custom render function that wraps components with necessary providers
 * Can be extended to include ThemeProvider, QueryClientProvider, etc.
 */
function customRender(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { ...options });
}

// Re-export everything from @testing-library/react
export * from "@testing-library/react";

// Override the default render with our custom render
export { customRender as render };
