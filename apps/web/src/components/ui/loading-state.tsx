import * as React from "react";
import { Spinner, type SpinnerProps } from "@/components/primitives";
import { cn } from "@/lib";

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  spinnerSize?: SpinnerProps["size"];
}

const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  (
    { className, message = "Loading...", spinnerSize = "default", ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-12",
          className
        )}
        {...props}
      >
        <Spinner size={spinnerSize} />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    );
  }
);
LoadingState.displayName = "LoadingState";

export { LoadingState };
export type { LoadingStateProps };
