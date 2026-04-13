import React from "react";
import { Button, Tooltip, TooltipContent, TooltipTrigger, cn } from "@ui-builder/ui";
import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

export interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  tooltip: React.ReactNode;
  tooltipSide?: "top" | "bottom" | "left" | "right";
  isActive?: boolean;
  activeClassName?: string;
  variant?: "link" | "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "icon-sm" | "icon" | "sm" | "default" | "lg";
  compact?: boolean; // For tool selection mode: smaller with rounded-sm
}

/**
 * ToolbarButton — reusable button for toolbar with icon + tooltip
 * - Default: Button component with ghost variant (normal toolbar buttons)
 * - compact=true: Raw button mimicking original tool selection style (rounded-sm, px-1 py-1)
 */
export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (
    {
      icon: Icon,
      tooltip,
      tooltipSide = "bottom",
      isActive = false,
      activeClassName = "bg-primary text-primary-foreground shadow-sm",
      variant = "ghost",
      size = "icon-sm",
      className,
      compact = false,
      ...props
    },
    ref
  ) => {
    if (compact) {
      // Compact mode for tool selection: raw button styling (matches original exactly)
      const compactClassName = cn(
        "inline-flex items-center justify-center rounded-sm px-1 py-1 text-sm font-medium transition-all",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-background/50",
        className
      );

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button ref={ref} className={compactClassName} {...props}>
              <Icon className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
        </Tooltip>
      );
    }

    // Standard mode: Button component
    const buttonClassName = cn(className, isActive ? activeClassName : "");

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            variant={variant}
            size={size}
            className={buttonClassName}
            {...props}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }
);

ToolbarButton.displayName = "ToolbarButton";
