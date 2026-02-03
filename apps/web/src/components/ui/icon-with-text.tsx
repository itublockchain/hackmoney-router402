import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface IconWithTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon: LucideIcon;
  iconClassName?: string;
}

const IconWithText = React.forwardRef<HTMLSpanElement, IconWithTextProps>(
  ({ className, icon: Icon, iconClassName, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn("inline-flex items-center gap-1.5", className)}
        {...props}
      >
        <Icon className={cn("h-4 w-4 shrink-0", iconClassName)} />
        <span>{children}</span>
      </span>
    );
  }
);
IconWithText.displayName = "IconWithText";

export { IconWithText };
export type { IconWithTextProps };
