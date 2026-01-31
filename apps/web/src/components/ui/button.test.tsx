import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/utils/test-utils";
import { Button } from "./button";

describe("Button Component", () => {
  it("renders correctly with default props", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("renders with different variants", () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-primary");

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-destructive");

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button")).toHaveClass("border");

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-secondary");

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button")).toHaveClass("hover:bg-accent");

    rerender(<Button variant="link">Link</Button>);
    expect(screen.getByRole("button")).toHaveClass("underline-offset-4");
  });

  it("renders with different sizes", () => {
    const { rerender } = render(<Button size="default">Default Size</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-9");

    rerender(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-8");

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-10");

    rerender(<Button size="icon">Icon</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-9");
  });

  it("handles click events", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("respects disabled state", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    );

    const button = screen.getByRole("button", { name: /disabled/i });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("applies custom className", () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole("button", { name: /custom/i });
    expect(button).toHaveClass("custom-class");
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Ref Button</Button>);
    expect(ref).toHaveBeenCalled();
  });

  it("renders children correctly", () => {
    render(
      <Button>
        <span>Icon</span>
        <span>Text</span>
      </Button>
    );

    expect(screen.getByText("Icon")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });
});
